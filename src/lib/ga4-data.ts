/**
 * GA4 Data API — Server-side only
 *
 * Fetches analytics data from Google Analytics 4 via the Data API.
 * The service account JSON key is stored encrypted in SiteSettings (DB).
 *
 * Prerequisites:
 *   1. Enable "Google Analytics Data API" in Google Cloud Console
 *   2. Create a service account and download the JSON key
 *   3. Grant "Viewer" access to the service account in GA4 admin
 *   4. Paste the JSON key into SiteSettings → GA4 → サービスアカウント秘密鍵
 *   5. Set ga4PropertyId in SiteSettings
 *   6. Set ENCRYPTION_KEY env var (for key encryption at rest)
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'
import type { Payload } from 'payload'
import { decrypt, isEncrypted } from '@/lib/encryption'

let client: BetaAnalyticsDataClient | null = null
let clientInitialized = false

/**
 * Ensure the GA4 client singleton is initialised.
 *
 * Reads the encrypted service account key from SiteSettings, decrypts it,
 * and creates the BetaAnalyticsDataClient. Falls back to the
 * GA4_SERVICE_ACCOUNT_KEY env var for backwards compatibility.
 *
 * Must be called once per request before using any GA4 query function.
 */
export async function ensureGA4Client(payload: Payload): Promise<void> {
  if (clientInitialized) return
  clientInitialized = true

  // 1. Try DB (SiteSettings)
  try {
    const settings = await payload.findGlobal({
      slug: 'site-settings',
      context: { rawSecrets: true }, // bypass afterRead mask
    })
    const rawKey = (settings as Record<string, unknown>)?.ga4ServiceAccountKey as
      | string
      | undefined
    if (rawKey && rawKey.length > 0) {
      const keyJson = isEncrypted(rawKey) ? decrypt(rawKey) : rawKey
      const credentials = JSON.parse(keyJson)
      client = new BetaAnalyticsDataClient({ credentials })
      return
    }
  } catch (err) {
    console.error('[GA4] DB key read/decrypt error:', err)
  }

  // 2. Fallback to env var
  const envKey = process.env.GA4_SERVICE_ACCOUNT_KEY
  if (envKey) {
    try {
      const credentials = JSON.parse(envKey)
      client = new BetaAnalyticsDataClient({ credentials })
    } catch (err) {
      console.error('[GA4] Env var parse error:', err)
    }
  }
}

/** Internal getter — returns cached client or null. */
function getClient(): BetaAnalyticsDataClient | null {
  return client
}

// ============================================================
// Session count
// ============================================================

export async function getGA4Sessions(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<number | null> {
  const ga4 = getClient()
  if (!ga4 || !propertyId) return null

  try {
    const [response] = await ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'sessions' }],
    })

    const sessions = response.rows?.[0]?.metricValues?.[0]?.value
    return sessions ? parseInt(sessions, 10) : null
  } catch (error) {
    console.error('[GA4] Data API error:', error)
    return null
  }
}

// ============================================================
// Conversion rate
// ============================================================

export async function getConversionRate(
  propertyId: string | undefined | null,
  startDate: string,
  endDate: string,
  orderCount: number,
): Promise<number | null> {
  if (!propertyId) return null

  const sessions = await getGA4Sessions(propertyId, startDate, endDate)
  if (!sessions || sessions <= 0) return null

  return Math.round((orderCount / sessions) * 1000) / 10
}

// ============================================================
// Aggregate metrics
// ============================================================

export interface GA4Metrics {
  sessions: number
  totalUsers: number
  pageviews: number
  bounceRate: number
  avgSessionDuration: number
  pagesPerSession: number
  addToCarts: number
  ecommercePurchases: number
}

export async function getGA4Metrics(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4Metrics | null> {
  const ga4 = getClient()
  if (!ga4 || !propertyId) return null

  try {
    const [response] = await ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'screenPageViewsPerSession' },
        { name: 'addToCarts' },
        { name: 'ecommercePurchases' },
      ],
    })

    const row = response.rows?.[0]?.metricValues ?? []

    return {
      sessions: parseInt(row[0]?.value ?? '0', 10),
      totalUsers: parseInt(row[1]?.value ?? '0', 10),
      pageviews: parseInt(row[2]?.value ?? '0', 10),
      bounceRate: Math.round(parseFloat(row[3]?.value ?? '0') * 1000) / 10,
      avgSessionDuration: Math.round(parseFloat(row[4]?.value ?? '0')),
      pagesPerSession: Math.round(parseFloat(row[5]?.value ?? '0') * 10) / 10,
      addToCarts: parseInt(row[6]?.value ?? '0', 10),
      ecommercePurchases: parseInt(row[7]?.value ?? '0', 10),
    }
  } catch (error) {
    console.error('[GA4] getGA4Metrics error:', error)
    return null
  }
}

// ============================================================
// Daily session counts (sparkline data)
// ============================================================

export interface GA4DailyMetric {
  date: string
  sessions: number
}

export async function getGA4DailyMetrics(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4DailyMetric[] | null> {
  const ga4 = getClient()
  if (!ga4 || !propertyId) return null

  try {
    const [response] = await ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    })

    if (!response.rows) return []

    return response.rows.map((row) => {
      const raw = row.dimensionValues?.[0]?.value ?? ''
      const date =
        raw.length === 8
          ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
          : raw
      return {
        date,
        sessions: parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      }
    })
  } catch (error) {
    console.error('[GA4] getGA4DailyMetrics error:', error)
    return null
  }
}

// ============================================================
// Returning visitor rate
// ============================================================

export async function getReturningVisitorRate(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<number | null> {
  const ga4 = getClient()
  if (!ga4 || !propertyId) return null

  try {
    const [response] = await ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'totalUsers' }],
    })

    if (!response.rows) return null

    let newUsers = 0
    let returningUsers = 0
    for (const row of response.rows) {
      const dim = row.dimensionValues?.[0]?.value ?? ''
      const count = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
      if (dim === 'new') newUsers = count
      else if (dim === 'returning') returningUsers = count
    }

    const total = newUsers + returningUsers
    if (total === 0) return null
    return Math.round((returningUsers / total) * 1000) / 10
  } catch (error) {
    console.error('[GA4] getReturningVisitorRate error:', error)
    return null
  }
}

// ============================================================
// Helper: format seconds → Japanese human-readable
// ============================================================

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}分${s}秒` : `${m}分`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}時間${rem}分` : `${h}時間`
}
