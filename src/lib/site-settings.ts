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

export type ShippingTimeSlot = {
  id: string
  label: string
  value: string
  active: boolean
  sortOrder: number
}

export type MessageCardTemplate = {
  id: string
  label: string
  body: string
  active: boolean
  sortOrder: number
}

export type GiftWrappingOption = {
  id: string
  label: string
  description: string | null
  feeAmount: number
  active: boolean
  sortOrder: number
}

export type ShippingRegionalFee = {
  id?: string
  region: string
  fee: number
  note?: string | null
}

export type ShippingPlanRegionalFee = {
  region: string
  fee: number
  note?: string | null
}

export type ShippingPlan = {
  id?: string | null
  name: string
  carrier: 'yamato' | 'sagawa' | 'yupack' | 'self_delivery' | 'other'
  calculationMethod: 'flat' | 'distance_based' | 'regional_table' | 'free'
  baseFee: number | null
  freeDistanceKm: number | null
  extraPerKmFee: number | null
  freeThreshold: number | null
  regionalFees: ShippingPlanRegionalFee[]
  availableTimeSlots: ShippingTimeSlot[]
  estimatedDaysMin: number | null
  estimatedDaysMax: number | null
  supportedAreas: string | null
  restrictedAreas: string | null
  active: boolean
  sortOrder: number
  notes: string | null
}

export type SiteSettingsData = {
  // 会社情報
  companyName: string | null
  companyRepresentative: string | null
  companyPostalCode: string | null
  companyAddress: string | null
  companyPhone: string | null
  companyBusinessHours: string | null
  companyContactEmail: string | null
  // サイト基本設定
  siteTitle: string | null
  siteDescription: string | null
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
  // Shipping
  shippingOriginAddress: string | null
  shippingStandardBaseFee: number | null
  shippingStandardFreeDistanceKm: number | null
  shippingDeliveryBaseFee: number | null
  shippingDeliveryFreeDistanceKm: number | null
  shippingExtraPerKmFee: number | null
  shippingDeliveryFreeThreshold: number | null
  // Bank transfer
  bankName: string | null
  bankBranchName: string | null
  bankAccountType: string | null
  bankAccountNumber: string | null
  bankAccountHolder: string | null
  bankTransferDeadlineDays: number | null
  // SNS
  snsInstagramUrl: string | null
  snsLineUrl: string | null
  snsXUrl: string | null
  snsFacebookUrl: string | null
  snsTiktokUrl: string | null
  snsYoutubeUrl: string | null
  // 地域別送料テーブル
  shippingRegionalFees: ShippingRegionalFee[] | null
  // 配送不可エリア
  shippingRestrictedAreas: string | null
  // OGP画像
  siteOgImageUrl: string | null
  // 決済方法一覧
  paymentMethodsText: string | null
  // 配送プラン
  shippingPlans: ShippingPlan[] | null
  // ギフト設定
  giftSettingsMessageCardTemplates: MessageCardTemplate[] | null
  giftSettingsWrappingOptions: GiftWrappingOption[] | null
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
    // 会社情報
    companyName: stringField(doc.companyName),
    companyRepresentative: stringField(doc.companyRepresentative),
    companyPostalCode: stringField(doc.companyPostalCode),
    companyAddress: stringField(doc.companyAddress),
    companyPhone: stringField(doc.companyPhone),
    companyBusinessHours: stringField(doc.companyBusinessHours),
    companyContactEmail: stringField(doc.companyContactEmail),
    // サイト基本設定
    siteTitle: stringField(doc.siteTitle),
    siteDescription: stringField(doc.siteDescription),
    stripeMode: ((doc.stripeMode as string) === 'live' ? 'live' : 'test'),
    stripeTestPublishableKey: decryptField(doc.stripeTestPublishableKey),
    stripeTestSecretKey: decryptField(doc.stripeTestSecretKey),
    stripeTestWebhookSecret: decryptField(doc.stripeTestWebhookSecret),
    stripeLivePublishableKey: decryptField(doc.stripeLivePublishableKey),
    stripeLiveSecretKey: decryptField(doc.stripeLiveSecretKey),
    stripeLiveWebhookSecret: decryptField(doc.stripeLiveWebhookSecret),
    resendApiKey: decryptField(doc.resendApiKey),
    googleMapsApiKey: decryptField(doc.googleMapsApiKey),
    // Shipping
    shippingOriginAddress: stringField(doc.shippingOriginAddress),
    shippingStandardBaseFee: numberField(doc.shippingStandardBaseFee),
    shippingStandardFreeDistanceKm: numberField(doc.shippingStandardFreeDistanceKm),
    shippingDeliveryBaseFee: numberField(doc.shippingDeliveryBaseFee),
    shippingDeliveryFreeDistanceKm: numberField(doc.shippingDeliveryFreeDistanceKm),
    shippingExtraPerKmFee: numberField(doc.shippingExtraPerKmFee),
    shippingDeliveryFreeThreshold: numberField(doc.shippingDeliveryFreeThreshold),
    // Bank transfer
    bankName: stringField(doc.bankName),
    bankBranchName: stringField(doc.bankBranchName),
    bankAccountType: stringField(doc.bankAccountType),
    bankAccountNumber: stringField(doc.bankAccountNumber),
    bankAccountHolder: stringField(doc.bankAccountHolder),
    bankTransferDeadlineDays: numberField(doc.bankTransferDeadlineDays),
    // SNS
    snsInstagramUrl: stringField(doc.snsInstagramUrl),
    snsLineUrl: stringField(doc.snsLineUrl),
    snsXUrl: stringField(doc.snsXUrl),
    snsFacebookUrl: stringField(doc.snsFacebookUrl),
    snsTiktokUrl: stringField(doc.snsTiktokUrl),
    snsYoutubeUrl: stringField(doc.snsYoutubeUrl),
    // 地域別送料テーブル
    shippingRegionalFees: arrayField<ShippingRegionalFee>(doc.shippingRegionalFees),
    shippingRestrictedAreas: stringField(doc.shippingRestrictedAreas),
    siteOgImageUrl: stringField(doc.siteOgImageUrl),
    paymentMethodsText: stringField(doc.paymentMethodsText),
    emailFromAddress: stringField(doc.emailFromAddress),
    emailFromName: stringField(doc.emailFromName),
    emailReplyTo: stringField(doc.emailReplyTo),
    adminAlertEmail: stringField(doc.adminAlertEmail),
    // ギフト設定
    giftSettingsMessageCardTemplates: (() => {
      const raw = (doc.giftSettingsMessageCardTemplates as unknown as Array<Record<string, unknown>>) ?? []
      if (!Array.isArray(raw) || raw.length === 0) return null
      return raw.map((t) => ({
        id: String(t.id ?? ''),
        label: String(t.label ?? ''),
        body: String(t.body ?? ''),
        active: Boolean(t.active ?? true),
        sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : Number(t.sortOrder ?? 0),
      })) as MessageCardTemplate[]
    })(),
    giftSettingsWrappingOptions: (() => {
      const raw = (doc.giftSettingsWrappingOptions as unknown as Array<Record<string, unknown>>) ?? []
      if (!Array.isArray(raw) || raw.length === 0) return null
      return raw.map((w) => ({
        id: String(w.id ?? ''),
        label: String(w.label ?? ''),
        description: (w.description as string | null | undefined) ?? null,
        feeAmount: typeof w.feeAmount === 'number' ? w.feeAmount : Number(w.feeAmount ?? 0),
        active: Boolean(w.active ?? true),
        sortOrder: typeof w.sortOrder === 'number' ? w.sortOrder : Number(w.sortOrder ?? 0),
      })) as GiftWrappingOption[]
    })(),
    // 配送プラン
    shippingPlans: (() => {
      const rawPlans = (doc.shippingPlans as unknown as Array<Record<string, unknown>>) ?? []
      if (!Array.isArray(rawPlans) || rawPlans.length === 0) return null
      const plans: ShippingPlan[] = rawPlans.map((p) => {
        const rawRegional = (p.regionalFees as Array<Record<string, unknown>> | undefined) ?? []
        return {
          id: (p.id as string | null | undefined) ?? null,
          name: String(p.name ?? ''),
          carrier: (p.carrier as ShippingPlan['carrier']) ?? 'other',
          calculationMethod: (p.calculationMethod as ShippingPlan['calculationMethod']) ?? 'flat',
          baseFee: typeof p.baseFee === 'number' ? p.baseFee : p.baseFee != null ? Number(p.baseFee) : null,
          freeDistanceKm: typeof p.freeDistanceKm === 'number' ? p.freeDistanceKm : p.freeDistanceKm != null ? Number(p.freeDistanceKm) : null,
          extraPerKmFee: typeof p.extraPerKmFee === 'number' ? p.extraPerKmFee : p.extraPerKmFee != null ? Number(p.extraPerKmFee) : null,
          freeThreshold: typeof p.freeThreshold === 'number' ? p.freeThreshold : p.freeThreshold != null ? Number(p.freeThreshold) : null,
          regionalFees: rawRegional.map((r) => ({
            region: String(r.region ?? ''),
            fee: typeof r.fee === 'number' ? r.fee : Number(r.fee ?? 0),
            note: (r.note as string | null | undefined) ?? null,
          })),
          availableTimeSlots: (() => {
            const rawSlots = (p.availableTimeSlots as Array<Record<string, unknown>> | undefined) ?? []
            return rawSlots.map((s) => ({
              id: String(s.id ?? ''),
              label: String(s.label ?? ''),
              value: String(s.value ?? ''),
              active: Boolean(s.active ?? true),
              sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : Number(s.sortOrder ?? 0),
            }))
          })(),
          estimatedDaysMin: typeof p.estimatedDaysMin === 'number' ? p.estimatedDaysMin : p.estimatedDaysMin != null ? Number(p.estimatedDaysMin) : null,
          estimatedDaysMax: typeof p.estimatedDaysMax === 'number' ? p.estimatedDaysMax : p.estimatedDaysMax != null ? Number(p.estimatedDaysMax) : null,
          supportedAreas: (p.supportedAreas as string | null | undefined) ?? null,
          restrictedAreas: (p.restrictedAreas as string | null | undefined) ?? null,
          active: Boolean(p.active ?? true),
          sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : Number(p.sortOrder ?? 0),
          notes: (p.notes as string | null | undefined) ?? null,
        }
      })
      return plans
    })(),
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

/** Coerce a numeric field to number | null. */
function numberField(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  return null
}

/** Coerce an array field to T[] | null. */
function arrayField<T>(value: unknown): T[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  return value as T[]
}
