import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Stripe from 'stripe'
import { getActiveStripeKeys } from '@/lib/site-settings'

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
    const activeKeys = await getActiveStripeKeys()
    const stripeKey = activeKeys.secretKey || null
    const stripe = stripeKey ? new Stripe(stripeKey) : null

    const payload = await getPayload({ config })

    // Authenticate user — ゲスト注文（isGuestOrder=true）の場合は user が null でも継続
    const { user } = await payload.auth({ headers: req.headers })

    const body = await req.json()
    const {
      items,
      shippingFee,
      deliveryAddress,
      deliveryDistance,
      desiredArrivalDate,
      desiredTimeSlot,
      eventName,
      eventDateTime,
      notes,
      subtotal,
      shippingPlanId,
      shippingPlanName,
      scheduledShipDate,
      sender,
      recipient,
      giftSettings,
      usageInfo,
      isGuestOrder,
    }: {
      items: Array<{ productId: string; quantity: number; selectedOptions: unknown; unitPrice: number }>
      shippingFee?: number
      deliveryAddress?: string
      deliveryDistance?: number
      desiredArrivalDate?: string
      desiredTimeSlot?: string
      eventName?: string
      eventDateTime?: string
      notes?: string
      subtotal?: number
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

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '商品が選択されていません' }, { status: 400 })
    }

    // ラッピング料金
    const wrappingFee = Number(giftSettings?.wrappingFee ?? 0)

    // Calculate total
    // ゲスト時はポイント使用を強制 0
    const resolvedPointsUsed = user ? (body.pointsUsed ?? 0) : 0
    const totalBeforePoints = (subtotal ?? 0) + (shippingFee ?? 0) + wrappingFee
    const pointsDiscount = Math.min(resolvedPointsUsed, totalBeforePoints)
    const totalAmount = totalBeforePoints - pointsDiscount

    // 1. Create a pending Order via Payload local API (bypasses access control)
    const orderItems = items.map((item) => ({
      product: item.productId,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions,
      unitPrice: item.unitPrice,
    }))

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

    const order = await payload.create({
      collection: 'orders',
      data: {
        // ゲスト時は customer を未設定
        ...(user ? { customer: user.id } : {}),
        items: orderItems,
        deliveryAddress: resolvedDeliveryAddress || undefined,
        deliveryDistance: deliveryDistance ?? 0,
        shippingFee: shippingFee ?? 0,
        subtotal: (subtotal ?? 0) + wrappingFee,
        pointsUsed: pointsDiscount,
        pointsEarned: 0,
        totalAmount,
        desiredArrivalDate: recipient?.desiredArrivalDate ?? desiredArrivalDate ?? undefined,
        desiredTimeSlot: recipient?.desiredTimeSlotValue ?? desiredTimeSlot ?? undefined,
        eventName: usageInfo?.eventName ?? eventName ?? undefined,
        eventDateTime: eventDateTime || undefined,
        notes: notes || undefined,
        status: 'pending',
        shippingPlanId: shippingPlanId ?? null,
        shippingPlanName: shippingPlanName ?? null,
        scheduledShipDate: scheduledShipDate ?? null,
        isGuestOrder: isGuestOrder ?? false,
        sender: senderFields,
        recipient: recipientFields,
        giftSettings: giftSettingsFields,
        usageInfo: usageInfoFields,
      },
    })

    // 2. Deduct points if used (会員のみ)
    // usePoints() は内部で totalAmount を order.subtotal+shippingFee で再計算して上書きするため、
    // wrappingFee を含む正確な totalAmount が失われる。
    // ここでは PointTransactions 作成とユーザー残高更新のみインラインで行い、
    // totalAmount は payload.create で確定した値を維持する。
    if (pointsDiscount > 0 && user) {
      try {
        const currentUser = await payload.findByID({ collection: 'users', id: user.id })
        const currentPoints = (currentUser.points as number) ?? 0

        if (pointsDiscount > currentPoints) {
          await payload.delete({ collection: 'orders', id: order.id })
          return NextResponse.json(
            { error: `ポイント不足です（保有: ${currentPoints}pt, 使用: ${pointsDiscount}pt）` },
            { status: 400 },
          )
        }

        const newBalance = currentPoints - pointsDiscount

        // PointTransactions レコードを作成
        await payload.create({
          collection: 'point-transactions',
          data: {
            user: user.id,
            type: 'use',
            amount: -pointsDiscount,
            balance: newBalance,
            order: order.id,
            description: `ポイント使用`,
          },
        })

        // ユーザーのポイント残高を減算（skipPointAdjustHook で二重記録を防止）
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { points: newBalance },
          context: { skipPointAdjustHook: true },
        })
      } catch (pointErr) {
        // Rollback: delete the order if point deduction fails
        await payload.delete({ collection: 'orders', id: order.id })
        const msg = pointErr instanceof Error ? pointErr.message : 'ポイント使用に失敗しました'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    // 送信者メールアドレス（Stripe session 用）
    const customerEmail = isGuestOrder ? (sender?.email ?? undefined) : (user?.email ?? undefined)

    // 3. Stripe Checkout or Mock fallback
    if (stripe) {
      // --- Real Stripe mode ---
      // Fetch product titles for line item descriptions
      const productIds = items.map((i) => i.productId)
      const productsResult = await payload.find({
        collection: 'products',
        where: { id: { in: productIds } },
        limit: 100,
      })
      const productMap = new Map(
        productsResult.docs.map((p) => [p.id, p.title as string]),
      )

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

      // Add product line items
      for (const item of items) {
        const productName = productMap.get(item.productId) || '商品'
        const optionSummary = buildOptionSummary(item.selectedOptions as Record<string, unknown> | null | undefined)
        const description = optionSummary ? `${productName}（${optionSummary}）` : productName

        lineItems.push({
          price_data: {
            currency: 'jpy',
            product_data: {
              name: description,
            },
            unit_amount: item.unitPrice,
          },
          quantity: item.quantity,
        })
      }

      // Add shipping as a line item
      if ((shippingFee ?? 0) > 0) {
        lineItems.push({
          price_data: {
            currency: 'jpy',
            product_data: { name: '配送料' },
            unit_amount: shippingFee,
          },
          quantity: 1,
        })
      }

      // Add wrapping fee as a line item
      if (wrappingFee > 0 && giftSettings?.wrappingOptionName) {
        lineItems.push({
          price_data: {
            currency: 'jpy',
            product_data: { name: `ラッピング料金（${giftSettings.wrappingOptionName}）` },
            unit_amount: wrappingFee,
          },
          quantity: 1,
        })
      }

      // Handle points discount by adjusting total
      // Stripe doesn't support negative line items, so we add a discount line
      let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
      if (pointsDiscount > 0) {
        // Create an ad-hoc coupon
        const coupon = await stripe.coupons.create({
          amount_off: pointsDiscount,
          currency: 'jpy',
          name: `ポイント使用 ${pointsDiscount}pt`,
          duration: 'once',
        })
        discounts = [{ coupon: coupon.id }]
      }

      const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        discounts,
        mode: 'payment',
        metadata: {
          orderId: order.id,
          // user.id が無い場合（ゲスト）は customerId は含めない
          ...(user ? { customerId: user.id } : {}),
        },
        success_url: `${baseUrl}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
      }

      // ゲスト or 会員のメールアドレスを Stripe session にセット
      if (customerEmail) {
        sessionParams.customer_email = customerEmail
      }

      const session = await stripe.checkout.sessions.create(sessionParams)

      // Save Stripe session ID to order
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { stripeSessionId: session.id },
      })

      return NextResponse.json({ url: session.url })
    } else {
      // --- Mock fallback (no STRIPE_SECRET_KEY) ---
      // Directly confirm the order
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'confirmed',
          stripeSessionId: `mock_session_${order.id}`,
        },
      })

      const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`
      return NextResponse.json({
        url: `${baseUrl}/order-complete?order_id=${order.id}`,
        mock: true,
      })
    }
  } catch (err) {
    console.error('[create-checkout-session] Error:', err)
    const message = err instanceof Error ? err.message : '処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Build a human-readable summary of selected options
 */
function buildOptionSummary(options: Record<string, unknown> | null | undefined): string {
  if (!options) return ''
  const parts: string[] = []

  const subs = options.subBalloons as Array<{ name: string }> | undefined
  if (subs && subs.length > 0) {
    parts.push(`サブバルーン: ${subs.map((s) => s.name).join(', ')}`)
  }

  const lettering = options.lettering as { enabled: boolean; text: string } | undefined
  if (lettering?.enabled) {
    parts.push(`文字入れ: ${lettering.text || '(あり)'}`)
  }

  const color = options.color as { name: string } | undefined
  if (color) {
    parts.push(`カラー: ${color.name}`)
  }

  return parts.join(' / ')
}
