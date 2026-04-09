import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { addDays } from 'date-fns'
import { getSiteSettings } from '@/lib/site-settings'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customerId,
      items,
      deliveryAddress,
      deliveryDistance,
      shippingFee,
      subtotal,
      pointsUsed,
      totalAmount,
      desiredArrivalDate,
      desiredTimeSlot,
      eventDateTime,
      notes,
    } = body

    if (!customerId || !items?.length) {
      return NextResponse.json({ error: 'customerId and items are required' }, { status: 400 })
    }

    const settings = await getSiteSettings()

    const bankInfo = {
      bankName: settings.bankName || '',
      branchName: settings.bankBranchName || '',
      accountType: settings.bankAccountType === 'checking' ? '当座' : '普通',
      accountNumber: settings.bankAccountNumber || '',
      accountHolder: settings.bankAccountHolder || '',
    }

    if (!bankInfo.bankName || !bankInfo.accountNumber) {
      return NextResponse.json(
        { error: '銀行振込の設定が完了していません。管理者にお問い合わせください。' },
        { status: 503 },
      )
    }

    const deadlineDays = settings.bankTransferDeadlineDays ?? 7

    const payload = await getPayload({ config })

    // Deduct points if used
    if (pointsUsed > 0) {
      const user = await payload.findByID({ collection: 'users', id: customerId })
      const currentPoints = (user.points as number) ?? 0

      if (currentPoints < pointsUsed) {
        return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
      }

      const newBalance = currentPoints - pointsUsed
      await payload.create({
        collection: 'point-transactions',
        data: {
          user: customerId,
          type: 'use',
          amount: -pointsUsed,
          balance: newBalance,
          description: `ポイント使用（銀行振込注文）`,
        },
      })
      await payload.update({
        collection: 'users',
        id: customerId,
        data: { points: newBalance },
        context: { skipPointAdjustHook: true },
      })
    }

    const deadline = addDays(new Date(), deadlineDays)

    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: customerId,
        items,
        deliveryAddress,
        deliveryDistance,
        shippingFee: shippingFee || 0,
        subtotal,
        pointsUsed: pointsUsed || 0,
        totalAmount,
        desiredArrivalDate,
        desiredTimeSlot,
        eventDateTime,
        notes,
        paymentMethod: 'bank_transfer',
        status: 'awaiting_payment',
        bankTransferDeadline: deadline.toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      bankInfo,
      deadline: deadline.toISOString(),
      totalAmount,
    })
  } catch (error) {
    console.error('Bank transfer order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
