/**
 * GA4 Data API — Server-side only
 *
 * Fetches session count from Google Analytics 4 via the Data API.
 * Used by the dashboard endpoint to calculate conversion rate.
 *
 * Prerequisites (manual setup):
 *   1. Enable "Google Analytics Data API" in Google Cloud Console
 *   2. Create a service account and download the JSON key
 *   3. Grant "Viewer" access to the service account in GA4 admin
 *   4. Set env var: GA4_SERVICE_ACCOUNT_KEY=<JSON key contents>
 *   5. Set ga4PropertyId in Payload SiteSettings
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'

let client: BetaAnalyticsDataClient | null = null

function getGA4Client(): BetaAnalyticsDataClient | null {
  if (client) return client

  const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY
  if (!keyJson) return null

  try {
    const credentials = JSON.parse(keyJson)
    client = new BetaAnalyticsDataClient({ credentials })
    return client
  } catch (err) {
    console.error('[GA4] Service account credentials parse error:', err)
    return null
  }
}

/**
 * Fetch total sessions for a date range from GA4.
 * Returns null if GA4 is not configured or an error occurs.
 */
export async function getGA4Sessions(
  propertyId: string,
  startDate: string, // 'YYYY-MM-DD'
  endDate: string,   // 'YYYY-MM-DD'
): Promise<number | null> {
  const ga4 = getGA4Client()
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

/**
 * Calculate conversion rate using GA4 sessions and order count.
 * Returns null if GA4 data is unavailable.
 */
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
// Aggregate metrics for a date range
// ============================================================

export interface GA4Metrics {
  sessions: number
  totalUsers: number
  pageviews: number
  bounceRate: number          // % (0–100)
  avgSessionDuration: number  // seconds
  pagesPerSession: number
  addToCarts: number
  ecommercePurchases: number
}

export async function getGA4Metrics(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4Metrics | null> {
  const ga4 = getGA4Client()
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

    // GA4 returns empty rows[] when there is no data for the period
    // (e.g. today with 0 traffic). Return zeros rather than null so the
    // dashboard shows real metrics instead of the "未設定" placeholder.
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
// Daily session counts for a date range (sparkline data)
// ============================================================

export interface GA4DailyMetric {
  date: string   // 'yyyy-MM-dd'
  sessions: number
}

export async function getGA4DailyMetrics(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<GA4DailyMetric[] | null> {
  const ga4 = getGA4Client()
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

    return response.rows.map(row => {
      // GA4 returns dates as 'YYYYMMDD'
      const raw = row.dimensionValues?.[0]?.value ?? ''
      const date = raw.length === 8
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
// Returning visitor rate (newVsReturning dimension)
// ============================================================

export async function getReturningVisitorRate(
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<number | null> {
  const ga4 = getGA4Client()
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
// Helper: format seconds into Japanese human-readable string
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
