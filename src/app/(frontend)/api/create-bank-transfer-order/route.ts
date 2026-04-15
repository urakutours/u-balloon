import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { addDays } from 'date-fns'
import { getSiteSettings } from '@/lib/site-settings'

// ---------------------------------------------------------------------------
// Types (mirroring client-side state shapes)
// ---------------------------------------------------------------------------

type SenderState = {
  name: string
  nameKana?: string
  email: string
  phone: string
  postalCode?: string
  prefecture?: string
  addressLine1?: string
  addressLine2?: string
}

type RecipientState = {
  sameAsSender?: boolean
  name?: string
  nameKana?: string
  phone?: string
  postalCode?: string
  prefecture?: string
  addressLine1?: string
  addressLine2?: string
  desiredArrivalDate?: string
  desiredTimeSlotValue?: string
  desiredTimeSlotLabel?: string
}

type GiftState = {
  wrappingOptionId?: string
  wrappingOptionName?: string
  wrappingFee?: number
  messageCardTemplateId?: string
  messageCardText?: string
}

type UsageInfo = {
  eventName?: string
  usageDate?: string
  usageTimeText?: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Authenticate user — body の customerId は無視し、セッションから取得した user.id を使う
    // ゲスト注文（isGuestOrder=true）の場合は user が null でも継続
    const { user } = await payload.auth({ headers: req.headers })

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
      sender,
      recipient,
      giftSettings,
      usageInfo,
      isGuestOrder,
    }: {
      items: Array<{ productId: string | number; quantity: number; selectedOptions: unknown; unitPrice: number }>
      deliveryAddress?: string
      deliveryDistance?: number
      shippingFee?: number
      subtotal?: number
      totalAmount?: number
      desiredArrivalDate?: string
      desiredTimeSlot?: string
      eventName?: string
      eventDateTime?: string
      notes?: string
      shippingPlanId?: string
      shippingPlanName?: string
      scheduledShipDate?: string
      sender?: SenderState
      recipient?: RecipientState
      giftSettings?: GiftState
      usageInfo?: UsageInfo
      isGuestOrder?: boolean
    } = body

    // 認証チェック: 非ゲスト注文かつ未認証はエラー
    if (!user && !isGuestOrder) {
      return NextResponse.json({ error: 'ログインしてください' }, { status: 401 })
    }

    // ゲスト注文バリデーション
    if (isGuestOrder) {
      if (!sender?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sender.email)) {
        return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
      }
      if (!sender?.name?.trim()) {
        return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
      }
      if (!sender?.phone?.trim()) {
        return NextResponse.json({ error: '電話番号を入力してください' }, { status: 400 })
      }
    }

    // 数値系は明示的に Number() で変換し NaN を 0 にフォールバック
    // ゲスト時はポイント使用を強制 0
    const pointsUsed = user ? Math.max(0, Math.floor(Number(body.pointsUsed) || 0)) : 0
    const wrappingFee = Number(giftSettings?.wrappingFee ?? 0)
    const resolvedSubtotal = Math.max(0, Number(subtotal) || 0)
    const resolvedShippingFee = Math.max(0, Number(shippingFee) || 0)
    const resolvedDistance = Math.max(0, Number(deliveryDistance) || 0)
    // totalAmount は常にサーバー側で計算する（クライアント送信値は無視・改ざんリスク対策）
    // body の totalAmount は型定義上受け取るが計算には使用しない
    const resolvedTotal = Math.max(0, resolvedSubtotal + resolvedShippingFee + wrappingFee - pointsUsed)

    if (!items?.length) {
      return NextResponse.json({ error: 'items are required' }, { status: 400 })
    }

    // ポイント使用時の残高チェック（注文作成前に行い、不足なら早期リターン）
    if (pointsUsed > 0 && user) {
      const userRecord = await payload.findByID({ collection: 'users', id: user.id })
      const currentPoints = (userRecord.points as number) ?? 0
      if (currentPoints < pointsUsed) {
        return NextResponse.json({ error: 'Insufficient points' }, { status: 400 })
      }
    }

    // クライアントは { productId, quantity, selectedOptions, unitPrice } 形式で送ってくるので、
    // Orders コレクションの items 配列フィールドの形（product 関係）に変換する
    const orderItems = items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions,
      unitPrice: item.unitPrice,
    }))

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

    let bankTransferDeadline: Date
    if (scheduledShipDate) {
      bankTransferDeadline = addDays(new Date(scheduledShipDate), -deadlineDays)
    } else {
      console.warn('[create-bank-transfer-order] scheduledShipDate not provided, falling back to orderDate + N days')
      bankTransferDeadline = addDays(new Date(), deadlineDays)
    }

    // 新フィールドのマッピング: クライアント側キー → Payload group フィールドキー
    const senderFields = sender
      ? {
          senderName: sender.name ?? '',
          senderNameKana: sender.nameKana ?? '',
          senderEmail: sender.email ?? '',
          senderPhone: sender.phone ?? '',
          senderPostalCode: sender.postalCode ?? '',
          senderPrefecture: sender.prefecture ?? '',
          senderAddressLine1: sender.addressLine1 ?? '',
          senderAddressLine2: sender.addressLine2 ?? '',
        }
      : {}

    const recipientFields = recipient
      ? {
          recipientSameAsSender: recipient.sameAsSender ?? true,
          recipientName: recipient.name ?? '',
          recipientNameKana: recipient.nameKana ?? '',
          recipientPhone: recipient.phone ?? '',
          recipientPostalCode: recipient.postalCode ?? '',
          recipientPrefecture: recipient.prefecture ?? '',
          recipientAddressLine1: recipient.addressLine1 ?? '',
          recipientAddressLine2: recipient.addressLine2 ?? '',
          recipientDesiredArrivalDate: recipient.desiredArrivalDate ?? '',
          recipientDesiredTimeSlotValue: recipient.desiredTimeSlotValue ?? '',
          recipientDesiredTimeSlotLabel: recipient.desiredTimeSlotLabel ?? '',
        }
      : {}

    const giftSettingsFields = giftSettings
      ? {
          giftWrappingOptionId: giftSettings.wrappingOptionId ?? '',
          giftWrappingOptionName: giftSettings.wrappingOptionName ?? '',
          giftWrappingFee: wrappingFee,
          giftMessageCardTemplateId: giftSettings.messageCardTemplateId ?? '',
          giftMessageCardText: giftSettings.messageCardText ?? '',
        }
      : {}

    const usageInfoFields = usageInfo
      ? {
          usageEventName: usageInfo.eventName ?? '',
          usageDate: usageInfo.usageDate || undefined,
          usageTimeText: usageInfo.usageTimeText ?? '',
        }
      : {}

    // 後方互換 deliveryAddress の生成
    const resolvedDeliveryAddress =
      deliveryAddress ??
      (recipient?.addressLine1
        ? `${recipient.prefecture ?? ''}${recipient.addressLine1}${recipient.addressLine2 ? ' ' + recipient.addressLine2 : ''}`
        : undefined)

    // 1. 注文を先に作成（pointsUsed は暫定 0、ポイント控除成功後に確定値で update）
    const order = await payload.create({
      collection: 'orders',
      data: {
        // ゲスト時は customer を未設定
        ...(user ? { customer: user.id } : {}),
        items: orderItems,
        deliveryAddress: resolvedDeliveryAddress,
        deliveryDistance: resolvedDistance,
        shippingFee: resolvedShippingFee,
        subtotal: resolvedSubtotal + wrappingFee,
        pointsUsed: 0, // 暫定 0 — ポイント控除成功後に確定値で update する
        totalAmount: resolvedSubtotal + resolvedShippingFee + wrappingFee, // ポイント控除前の合計（暫定）
        desiredArrivalDate: recipient?.desiredArrivalDate ?? desiredArrivalDate,
        desiredTimeSlot: recipient?.desiredTimeSlotValue ?? desiredTimeSlot,
        eventName: usageInfo?.eventName ?? eventName ?? undefined,
        eventDateTime,
        notes,
        paymentMethod: 'bank_transfer',
        status: 'awaiting_payment',
        shippingPlanId: shippingPlanId ?? null,
        shippingPlanName: shippingPlanName ?? null,
        scheduledShipDate: scheduledShipDate ?? null,
        bankTransferDeadline: bankTransferDeadline.toISOString(),
        isGuestOrder: isGuestOrder ?? false,
        sender: senderFields,
        recipient: recipientFields,
        giftSettings: giftSettingsFields,
        usageInfo: usageInfoFields,
      },
    })

    // 2. ポイント控除（会員かつ pointsUsed > 0 の場合のみ）
    // 注文を先に作成し、控除失敗時は注文を削除してロールバックする
    if (pointsUsed > 0 && user) {
      try {
        const userRecord = await payload.findByID({ collection: 'users', id: user.id })
        const currentPoints = (userRecord.points as number) ?? 0
        const newBalance = currentPoints - pointsUsed

        // point-transactions 作成
        await payload.create({
          collection: 'point-transactions',
          data: {
            user: user.id,
            type: 'use',
            amount: -pointsUsed,
            balance: newBalance,
            order: order.id,
            description: `ポイント使用（銀行振込注文）`,
          },
        })

        // users.points 更新（skipPointAdjustHook で二重記録を防止）
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { points: newBalance },
          context: { skipPointAdjustHook: true },
        })

        // orders の pointsUsed と totalAmount を確定値で update
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: { pointsUsed, totalAmount: resolvedTotal },
        })
      } catch (pointError) {
        // ポイント控除失敗 → 注文を削除してロールバック
        console.error('[create-bank-transfer-order] ポイント控除失敗、注文をロールバック:', pointError)
        await payload.delete({ collection: 'orders', id: order.id }).catch(console.error)
        return NextResponse.json(
          { error: 'ポイント処理に失敗しました。時間をおいて再試行してください。' },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      bankInfo,
      deadline: bankTransferDeadline.toISOString(),
      totalAmount: resolvedTotal,
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : undefined
    console.error('[create-bank-transfer-order] Error:', errMsg)
    if (errStack) console.error(errStack)
    // 詳細エラーはログにのみ残し、ユーザーには汎用メッセージを返す
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
