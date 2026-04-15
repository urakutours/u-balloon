import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getSiteSettings } from '@/lib/site-settings'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })

    // Authenticate user
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'ログインしてください' }, { status: 401 })
    }

    const order = await payload.findByID({
      collection: 'orders',
      id,
      depth: 1,
    })

    if (!order) {
      return NextResponse.json({ error: '注文が見つかりません' }, { status: 404 })
    }

    // Access check: admin or order owner
    const customerId =
      typeof order.customer === 'object' && order.customer !== null
        ? (order.customer as { id: string }).id
        : order.customer

    if (user.role !== 'admin' && customerId !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // For bank_transfer orders, attach bankInfo from site settings
    let bankInfo: {
      bankName: string | null
      branchName: string | null
      accountType: string | null
      accountNumber: string | null
      accountHolder: string | null
    } | null = null

    if (order.paymentMethod === 'bank_transfer') {
      const settings = await getSiteSettings()
      bankInfo = {
        bankName: settings.bankName,
        branchName: settings.bankBranchName,
        accountType: settings.bankAccountType,
        accountNumber: settings.bankAccountNumber,
        accountHolder: settings.bankAccountHolder,
      }
    }

    return NextResponse.json({
      ...order,
      bankInfo,
    })
  } catch (error) {
    console.error('[api/orders/[id]] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
