import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Stripe from 'stripe'
import { getSiteSettings } from '@/lib/site-settings'

export async function POST(req: NextRequest) {
  try {
    const { planId, customerId } = await req.json()

    if (!planId || !customerId) {
      return NextResponse.json({ error: 'planId and customerId are required' }, { status: 400 })
    }

    const settings = await getSiteSettings()
    const stripeKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const payload = await getPayload({ config })
    const plan = await payload.findByID({ collection: 'subscription-plans', id: planId }) as any
    const user = await payload.findByID({ collection: 'users', id: customerId }) as any

    if (!plan || plan.status !== 'published' || !plan.stripePriceId) {
      return NextResponse.json({ error: 'Plan not available' }, { status: 400 })
    }

    const stripe = new Stripe(stripeKey)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/account?subscription=success`,
      cancel_url: `${appUrl}/account?subscription=cancelled`,
      metadata: {
        planId: plan.id,
        customerId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
