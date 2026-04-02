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
