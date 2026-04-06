import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Lightweight endpoint for the admin sidebar to display the current Stripe mode badge.
 * Returns only the mode value — no secrets are exposed.
 */
export async function GET() {
  try {
    const settings = await getSiteSettings()
    return NextResponse.json({ mode: settings.stripeMode || 'test' })
  } catch {
    return NextResponse.json({ mode: 'test' })
  }
}
