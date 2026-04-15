import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { addDays } from 'date-fns'
import { getSiteSettings } from '@/lib/site-settings'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Authenticate user — body の customerId は無視し、セッションから取得した user.id を使う
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'ログインしてください' }, { status: 401 })
    }
    const resolvedCustomerId = user.id

    const body = await req.json()
    const {
      items,
      deliveryAddress,
      deliveryDistance,
      shippingFee,
      subtotal,
      totalAmount,
      desiredArrivalDate,
      desiredTimeSlot,
      eventName,
      eventDateTime,
      notes,
      shippingPlanId,
      shippingPlanName,
      scheduledShipDate,
    } = body

    // 数値系は明示的に Number() で変換し NaN を 0 にフォールバック
    const pointsUsed = Math.max(0, Math.floor(Number(body.pointsUsed) || 0))
    const resolvedTotal = Math.max(0, Number(totalAmount) || 0)
    const resolvedSubtotal = Math.max(0, Number(subtotal) || 0)
    const resolvedShippingFee = Math.max(0, Number(shippingFee) || 0)
    const resolvedDistance = Math.max(0, Number(deliveryDistance) || 0)

    if (!items?.length) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 })
    }

    const settings = await getSiteSettings()

    // accountType は DB 生値 ('checking' / 'ordinary' / 'savings' / 'normal') で保持し、
    // 表示側の formatAccountType ヘルパ (email-templates) で日本語に変換する。
    // これにより変換ロジックが一箇所に集約される。
    const bankInfo = {
      bankName: settings.bankName || '',
      branchName: settings.bankBranchName || '',
      accountType: settings.bankAccountType || '',
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

    // Deduct points if used
    if (pointsUsed > 0) {
      const userRecord = await payload.findByID({ collection: 'users', id: resolvedCustomerId })
      const currentPoints = (userRecord.points as number) ?? 0

      if (currentPoints < pointsUsed) {
        return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
      }

      const newBalance = currentPoints - pointsUsed
      await payload.create({
        collection: 'point-transactions',
        data: {
          user: resolvedCustomerId,
          type: 'use',
          amount: -pointsUsed,
          balance: newBalance,
          description: `ポイント使用（銀行振込注文）`,
        },
      })
      await payload.update({
        collection: 'users',
        id: resolvedCustomerId,
        data: { points: newBalance },
        context: { skipPointAdjustHook: true },
      })
    }

    let bankTransferDeadline: Date
    if (scheduledShipDate) {
      bankTransferDeadline = addDays(new Date(scheduledShipDate), -deadlineDays)
    } else {
      console.warn('[create-bank-transfer-order] scheduledShipDate not provided, falling back to orderDate + N days')
      bankTransferDeadline = addDays(new Date(), deadlineDays)
    }

    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: resolvedCustomerId,
        items,
        deliveryAddress,
        deliveryDistance: resolvedDistance,
        shippingFee: resolvedShippingFee,
        subtotal: resolvedSubtotal,
        pointsUsed: pointsUsed || 0,
        totalAmount: resolvedTotal,
        desiredArrivalDate,
        desiredTimeSlot,
        eventName: eventName || undefined,
        eventDateTime,
        notes,
        paymentMethod: 'bank_transfer',
        status: 'awaiting_payment',
        shippingPlanId: shippingPlanId ?? null,
        shippingPlanName: shippingPlanName ?? null,
        scheduledShipDate: scheduledShipDate ?? null,
        bankTransferDeadline: bankTransferDeadline.toISOString(),
      },
    })

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      bankInfo,
      deadline: bankTransferDeadline.toISOString(),
      totalAmount: resolvedTotal,
    })
  } catch (error) {
    console.error('Bank transfer order error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
