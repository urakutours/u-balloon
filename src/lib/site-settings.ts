/**
 * Cached helper for reading SiteSettings from DB.
 *
 * DB values take priority over environment variables.
 * Cache TTL: 60 seconds (invalidated immediately on afterChange hook).
 */

import { getPayload } from 'payload'
import { decrypt } from './encryption'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SiteSettingsData = {
  // Stripe mode
  stripeMode: 'test' | 'live'
  // Stripe (test/live keys)
  stripeTestPublishableKey: string | null
  stripeTestSecretKey: string | null
  stripeTestWebhookSecret: string | null
  stripeLivePublishableKey: string | null
  stripeLiveSecretKey: string | null
  stripeLiveWebhookSecret: string | null
  // Resend / email
  resendApiKey: string | null
  emailFromAddress: string | null
  emailFromName: string | null
  emailReplyTo: string | null
  adminAlertEmail: string | null
  // Google Maps
  googleMapsApiKey: string | null
}

export type ActiveStripeKeys = {
  publishableKey: string
  secretKey: string
  webhookSecret: string
  mode: 'test' | 'live'
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let _cache: SiteSettingsData | null = null
let _cacheExpiresAt = 0
const CACHE_TTL_MS = 60_000

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Read settings from DB (cached for 60 s). DB values override env vars. */
export async function getSiteSettings(): Promise<SiteSettingsData> {
  const now = Date.now()
  if (_cache && now < _cacheExpiresAt) return _cache

  // Lazy import to avoid circular dependency:
  // SiteSettings.ts (Payload global) → site-settings.ts → @payload-config → SiteSettings.ts
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  const doc = await payload.findGlobal({
    slug: 'site-settings',
    context: { rawSecrets: true },
  })

  _cache = {
    stripeMode: ((doc.stripeMode as string) === 'live' ? 'live' : 'test'),
    stripeTestPublishableKey: decryptField(doc.stripeTestPublishableKey),
    stripeTestSecretKey: decryptField(doc.stripeTestSecretKey),
    stripeTestWebhookSecret: decryptField(doc.stripeTestWebhookSecret),
    stripeLivePublishableKey: decryptField(doc.stripeLivePublishableKey),
    stripeLiveSecretKey: decryptField(doc.stripeLiveSecretKey),
    stripeLiveWebhookSecret: decryptField(doc.stripeLiveWebhookSecret),
    resendApiKey: decryptField(doc.resendApiKey),
    googleMapsApiKey: decryptField(doc.googleMapsApiKey),
    emailFromAddress: stringField(doc.emailFromAddress),
    emailFromName: stringField(doc.emailFromName),
    emailReplyTo: stringField(doc.emailReplyTo),
    adminAlertEmail: stringField(doc.adminAlertEmail),
  }
  _cacheExpiresAt = now + CACHE_TTL_MS
  return _cache
}

/**
 * Returns the active Stripe keys based on the current stripeMode setting.
 */
export async function getActiveStripeKeys(): Promise<ActiveStripeKeys> {
  const settings = await getSiteSettings()
  const mode = settings.stripeMode

  if (mode === 'live') {
    return {
      publishableKey: settings.stripeLivePublishableKey || '',
      secretKey: settings.stripeLiveSecretKey || '',
      webhookSecret: settings.stripeLiveWebhookSecret || '',
      mode: 'live',
    }
  }

  return {
    publishableKey: settings.stripeTestPublishableKey || '',
    secretKey: settings.stripeTestSecretKey || '',
    webhookSecret: settings.stripeTestWebhookSecret || '',
    mode: 'test',
  }
}

/** Immediately invalidate the in-memory cache. Called from SiteSettings afterChange hook. */
export function clearSiteSettingsCache(): void {
  _cache = null
  _cacheExpiresAt = 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decrypt an encrypted field; return null if absent or decryption fails. */
function decryptField(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null
  try {
    const result = decrypt(value)
    return result || null
  } catch {
    return null
  }
}

/** Coerce a plain string field to string | null. */
function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}
