import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  getConversionRate,
  getGA4Metrics,
  getGA4DailyMetrics,
  getReturningVisitorRate,
} from '@/lib/ga4-data'
import {
  getRevenueSummary,
  getStatusDistribution,
  getCustomerMetrics,
  getDailyRevenue,
  getTopProducts,
  getNewMembersCount,
  getPendingCount,
  getShippingCounts,
  getDeliverySlotCounts,
} from '@/lib/dashboard-queries'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  differenceInDays,
  format,
} from 'date-fns'

// ============================================================
// Helper: calculate change rate (%)
// ============================================================
function calcChangeRate(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return 0
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// ============================================================
// Helper: previous period label
// ============================================================
function prevPeriodLabel(period: string): string {
  switch (period) {
    case 'today': return '前日比'
    case 'week': return '前週比'
    case 'month': return '前月比'
    default: return '前期比'
  }
}

// ============================================================
// Main handler
// ============================================================
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })

  // Auth check
  const { user } = await payload.auth({ headers: req.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: '権限がありません' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'today'
  const customStart = searchParams.get('start')
  const customEnd = searchParams.get('end')

  const now = new Date()
  let periodStart: Date
  let periodEnd: Date

  switch (period) {
    case 'week':
      periodStart = startOfWeek(now, { weekStartsOn: 1 })
      periodEnd = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'month':
      periodStart = startOfMonth(now)
      periodEnd = endOfMonth(now)
      break
    case 'custom': {
      const cs = customStart ? startOfDay(new Date(customStart)) : startOfDay(now)
      const ce = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now)
      if (cs > ce) {
        return NextResponse.json({ error: '開始日は終了日より前に設定してください' }, { status: 400 })
      }
      periodStart = cs
      periodEnd = ce < endOfDay(now) ? ce : endOfDay(now)
      break
    }
    default: // today
      periodStart = startOfDay(now)
      periodEnd = endOfDay(now)
  }

  // ---- Previous period ----
  let prevStart: Date
  let prevEnd: Date
  switch (period) {
    case 'today':
      prevStart = startOfDay(subDays(now, 1))
      prevEnd = endOfDay(subDays(now, 1))
      break
    case 'week':
      prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
      break
    case 'month':
      prevStart = startOfMonth(subMonths(now, 1))
      prevEnd = endOfMonth(subMonths(now, 1))
      break
    default: { // custom
      const spanDays = differenceInDays(periodEnd, periodStart) + 1
      prevEnd = subDays(periodStart, 1)
      prevStart = startOfDay(subDays(periodStart, spanDays))
      break
    }
  }

  // ============================================================
  // Parallel SQL queries — no limit:2000 constraint
  // ============================================================
  const [
    current,
    previous,
    statusDist,
    customerMetrics,
    dailyRevenue,
    topProducts,
    newMembers,
    pendingCount,
    shipping,
    deliverySlots,
    // Non-aggregation queries still use payload.find (small result sets)
    recentOrders,
    upcomingHolidays,
    lowStockResult,
    siteSettings,
  ] = await Promise.all([
    getRevenueSummary(payload, periodStart, periodEnd),
    getRevenueSummary(payload, prevStart, prevEnd),
    getStatusDistribution(payload),
    getCustomerMetrics(payload),
    getDailyRevenue(payload, periodStart, periodEnd),
    getTopProducts(payload),
    getNewMembersCount(payload, periodStart, periodEnd),
    getPendingCount(payload),
    getShippingCounts(payload),
    getDeliverySlotCounts(payload),
    // Recent 5 orders — small result, keep as payload.find for depth resolution
    payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 5,
      depth: 1,
    }),
    // Upcoming holidays — needs business-calendar collection
    payload.find({
      collection: 'business-calendar',
      where: {
        and: [
          { date: { greater_than_equal: startOfDay(now).toISOString() } },
          { date: { less_than: new Date(startOfDay(now).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() } },
          { or: [{ isHoliday: { equals: true } }, { shippingAvailable: { equals: false } }] },
        ],
      },
      sort: 'date',
      limit: 20,
    }),
    // Low stock products — needs products collection
    payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { stock: { exists: true } },
          { stock: { less_than_equal: 10 } },
        ],
      },
      sort: 'stock',
      limit: 10,
      depth: 0,
    }),
    payload.findGlobal({ slug: 'site-settings' }),
  ])

  // ============================================================
  // Format recent orders
  // ============================================================
  const formattedRecentOrders = recentOrders.docs.map((order) => {
    const customer = order.customer as { id: string; name?: string; email: string } | null
    return {
      id: order.id,
      orderNumber: order.orderNumber as string,
      customerName: customer ? (customer.name || customer.email) : '-',
      totalAmount: order.totalAmount as number,
      status: order.status as string,
      createdAt: order.createdAt,
    }
  })

  // ============================================================
  // Format holidays
  // ============================================================
  const holidays = upcomingHolidays.docs.map((entry) => ({
    id: entry.id,
    date: entry.date as string,
    isHoliday: entry.isHoliday as boolean,
    shippingAvailable: entry.shippingAvailable as boolean,
    holidayReason: (entry.holidayReason as string) || '',
  }))

  // ============================================================
  // Status counts — convert StatusDistribution to Record<string, number>
  // ============================================================
  const statusCounts: Record<string, number> = {
    pending: statusDist.pending,
    awaiting_payment: statusDist.awaiting_payment,
    confirmed: statusDist.confirmed,
    preparing: statusDist.preparing,
    shipped: statusDist.shipped,
    delivered: statusDist.delivered,
    cancelled: statusDist.cancelled,
  }

  // ============================================================
  // GA4 — all calls in one parallel batch (propId resolved first)
  // ============================================================
  const propId = (siteSettings as { ga4PropertyId?: string })?.ga4PropertyId ?? null
  const ga4Start = format(periodStart, 'yyyy-MM-dd')
  const ga4End = format(periodEnd, 'yyyy-MM-dd')

  const [conversionRate, ga4Metrics, ga4Daily, returningVisitorRate] = await Promise.all([
    propId ? getConversionRate(propId, ga4Start, ga4End, current.orderCount).catch(() => null) : Promise.resolve(null),
    propId ? getGA4Metrics(propId, ga4Start, ga4End).catch(() => null) : Promise.resolve(null),
    propId ? getGA4DailyMetrics(propId, ga4Start, ga4End).catch(() => null) : Promise.resolve(null),
    propId ? getReturningVisitorRate(propId, ga4Start, ga4End).catch(() => null) : Promise.resolve(null),
  ])

  // ============================================================
  // Response
  // ============================================================
  return NextResponse.json({
    summary: {
      orderCount: current.orderCount,
      revenue: current.revenue,
      pendingCount,
      newUserCount: newMembers,
      totalOrders: statusDist.pending + statusDist.awaiting_payment + statusDist.confirmed +
        statusDist.preparing + statusDist.shipped + statusDist.delivered + statusDist.cancelled,
      todayDeliveryCount: shipping.today,
      tomorrowDeliveryCount: shipping.tomorrow,
    },
    comparison: {
      prevRevenue: previous.revenue,
      prevOrderCount: previous.orderCount,
      revenueChangeRate: calcChangeRate(current.revenue, previous.revenue),
      orderChangeRate: calcChangeRate(current.orderCount, previous.orderCount),
      label: prevPeriodLabel(period),
    },
    dailyTrend: dailyRevenue,
    recentOrders: formattedRecentOrders,
    statusCounts,
    deliverySlotCounts: {
      morning: deliverySlots.morning,
      afternoon: deliverySlots.afternoon,
      evening: deliverySlots.evening,
      night: deliverySlots.night,
      unspecified: deliverySlots.unspecified,
    },
    upcomingHolidays: holidays,
    lowStockProducts: lowStockResult.docs.map((p) => ({
      id: String(p.id),
      title: p.title as string,
      stock: p.stock as number | null,
      lowStockThreshold: p.lowStockThreshold as number | null | undefined,
    })),
    topProducts,
    quickStats: {
      conversionRate,
      avgOrderValue: customerMetrics.avgOrderValue,
      repeatRate: customerMetrics.repeatRate,
      avgLTV: customerMetrics.avgLTV,
      newMembersCount: newMembers,
    },
    siteTraffic: ga4Metrics ? {
      sessions: ga4Metrics.sessions,
      totalUsers: ga4Metrics.totalUsers,
      pageviews: ga4Metrics.pageviews,
      bounceRate: ga4Metrics.bounceRate,
      avgSessionDuration: ga4Metrics.avgSessionDuration,
      pagesPerSession: ga4Metrics.pagesPerSession,
      dailyChart: ga4Daily ?? null,
    } : null,
    conversionFunnel: {
      sessions: ga4Metrics?.sessions ?? null,
      addToCarts: ga4Metrics?.addToCarts ?? null,
      purchases: current.orderCount,
    },
    customerInsights: {
      repeatRate: customerMetrics.repeatRate,
      avgLTV: customerMetrics.avgLTV,
      avgOrderValue: customerMetrics.avgOrderValue,
      newMembersCount: newMembers,
      returningVisitorRate: returningVisitorRate ?? null,
    },
    period: {
      type: period,
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
  })
}
