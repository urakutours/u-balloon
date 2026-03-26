import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { usePoints } from '@/lib/points'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Get authenticated user from Payload headers
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'ログインしてください' }, { status: 401 })
    }

    const body = await req.json()
    const { orderId, pointsToUse } = body

    if (!orderId || !pointsToUse) {
      return NextResponse.json(
        { error: 'orderId と pointsToUse は必須です' },
        { status: 400 },
      )
    }

    // 注文の所有者確認
    const order = await payload.findByID({ collection: 'orders', id: orderId })
    const customerId = typeof order.customer === 'object' ? order.customer.id : order.customer
    if (customerId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'この注文に対する権限がありません' }, { status: 403 })
    }

    const result = await usePoints(payload, {
      userId: user.id,
      orderId,
      pointsToUse: Math.floor(Number(pointsToUse)),
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
