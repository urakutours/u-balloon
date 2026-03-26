import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 },
    )
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id

        if (!orderId) {
          console.error('[Stripe Webhook] No orderId in session metadata')
          break
        }

        console.log('[Stripe Webhook] checkout.session.completed for order:', orderId)

        // Update order to confirmed with payment intent ID
        // The afterOrderChange hook will automatically:
        // - Send status update email
        // - Earn points (3% of subtotal)
        // - Send points earned email
        await payload.update({
          collection: 'orders',
          id: orderId,
          data: {
            status: 'confirmed',
            stripePaymentIntentId: paymentIntentId || undefined,
          },
        })

        console.log('[Stripe Webhook] Order confirmed:', orderId)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (!orderId) {
          console.error('[Stripe Webhook] No orderId in expired session metadata')
          break
        }

        console.log('[Stripe Webhook] checkout.session.expired for order:', orderId)

        // Get the order to check if points were used
        const order = await payload.findByID({
          collection: 'orders',
          id: orderId,
        })

        // Cancel the order
        await payload.update({
          collection: 'orders',
          id: orderId,
          data: { status: 'cancelled' },
        })

        // Return points if they were used
        const pointsUsed = (order.pointsUsed as number) ?? 0
        if (pointsUsed > 0) {
          const customerId =
            typeof order.customer === 'object'
              ? (order.customer as { id: string }).id
              : (order.customer as string)

          // Get current user points
          const user = await payload.findByID({
            collection: 'users',
            id: customerId,
          })
          const currentPoints = (user.points as number) ?? 0
          const newBalance = currentPoints + pointsUsed

          // Create a refund point transaction
          await payload.create({
            collection: 'point-transactions',
            data: {
              user: customerId,
              type: 'adjust',
              amount: pointsUsed,
              balance: newBalance,
              order: orderId,
              description: `ポイント返還（注文キャンセル: ${order.orderNumber}）`,
            },
          })

          // Update user points
          await payload.update({
            collection: 'users',
            id: customerId,
            data: { points: newBalance },
            context: { skipPointAdjustHook: true },
          })

          console.log('[Stripe Webhook] Points returned:', pointsUsed, 'for order:', orderId)
        }

        console.log('[Stripe Webhook] Order cancelled:', orderId)
        break
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type)
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err)
    // Return 200 to avoid Stripe retries for processing errors
    return NextResponse.json({ received: true, error: 'Processing error' })
  }

  return NextResponse.json({ received: true })
}
