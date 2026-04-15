import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { usePoints } from '@/lib/points'
import Stripe from 'stripe'
import { getActiveStripeKeys } from '@/lib/site-settings'

export async function POST(req: NextRequest) {
  try {
    const activeKeys = await getActiveStripeKeys()
    const stripeKey = activeKeys.secretKey || null
    const stripe = stripeKey ? new Stripe(stripeKey) : null

    const payload = await getPayload({ config })

    // Authenticate user
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) {
      return NextResponse.json({ error: 'ログインしてください' }, { status: 401 })
    }

    const body = await req.json()
    const {
      items,
      shippingFee,
      pointsUsed,
      deliveryAddress,
      deliveryDistance,
      desiredArrivalDate,
      desiredTimeSlot,
      eventDateTime,
      notes,
      subtotal,
      shippingPlanId,
      shippingPlanName,
      scheduledShipDate,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: '商品が選択されていません' }, { status: 400 })
    }

    // Calculate total
    const totalBeforePoints = (subtotal ?? 0) + (shippingFee ?? 0)
    const pointsDiscount = Math.min(pointsUsed ?? 0, totalBeforePoints)
    const totalAmount = totalBeforePoints - pointsDiscount

    // 1. Create a pending Order via Payload local API (bypasses access control)
    const orderItems = items.map((item: {
      productId: string
      quantity: number
      selectedOptions: unknown
      unitPrice: number
    }) => ({
      product: item.productId,
      quantity: item.quantity,
      selectedOptions: item.selectedOptions,
      unitPrice: item.unitPrice,
    }))

    const order = await payload.create({
      collection: 'orders',
      data: {
        customer: user.id,
        items: orderItems,
        deliveryAddress: deliveryAddress || undefined,
        deliveryDistance: deliveryDistance ?? 0,
        shippingFee: shippingFee ?? 0,
        subtotal: subtotal ?? 0,
        pointsUsed: pointsDiscount,
        pointsEarned: 0,
        totalAmount,
        desiredArrivalDate: desiredArrivalDate || undefined,
        desiredTimeSlot: desiredTimeSlot || undefined,
        eventDateTime: eventDateTime || undefined,
        notes: notes || undefined,
        status: 'pending',
        shippingPlanId: shippingPlanId ?? null,
        shippingPlanName: shippingPlanName ?? null,
        scheduledShipDate: scheduledShipDate ?? null,
      },
    })

    // 2. Deduct points if used
    if (pointsDiscount > 0) {
      try {
        await usePoints(payload, {
          userId: user.id,
          orderId: order.id,
          pointsToUse: pointsDiscount,
        })
      } catch (pointErr) {
        // Rollback: delete the order if point deduction fails
        await payload.delete({ collection: 'orders', id: order.id })
        const msg = pointErr instanceof Error ? pointErr.message : 'ポイント使用に失敗しました'
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    // 3. Stripe Checkout or Mock fallback
    if (stripe) {
      // --- Real Stripe mode ---
      // Fetch product titles for line item descriptions
      const productIds = items.map((i: { productId: string }) => i.productId)
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
      for (const item of items as Array<{
        productId: string
        quantity: number
        selectedOptions: Record<string, unknown>
        unitPrice: number
      }>) {
        const productName = productMap.get(item.productId) || '商品'
        const optionSummary = buildOptionSummary(item.selectedOptions)
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

      // Handle points discount by adjusting total
      // Stripe doesn't support negative line items, so we add a discount line
      if (pointsDiscount > 0) {
        lineItems.push({
          price_data: {
            currency: 'jpy',
            product_data: { name: `ポイント値引き（${pointsDiscount}pt）` },
            unit_amount: -pointsDiscount, // Not supported by Stripe directly
          },
          quantity: 1,
        })
      }

      // Actually, Stripe doesn't allow negative unit_amount.
      // Instead, use a coupon or adjust the line items.
      // For simplicity, we'll use discounts with a coupon.
      let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined
      if (pointsDiscount > 0) {
        // Remove the negative line item we just added
        lineItems.pop()

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

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        discounts,
        mode: 'payment',
        metadata: {
          orderId: order.id,
          customerId: user.id,
        },
        success_url: `${baseUrl}/order-complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
      })

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
