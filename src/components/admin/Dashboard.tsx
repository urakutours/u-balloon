import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } from 'date-fns'
import DashboardClient from './DashboardClient'
import { getConversionRate } from '@/lib/ga4-data'
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

export default async function Dashboard() {
  const payload = await getPayload({ config })

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })

  const [
    weekRevenue,
    prevWeekRevenue,
    statusDist,
    customerMetrics,
    weekDailyRevenue,
    topProducts,
    todayNewMembers,
    pendingCount,
    shipping,
    deliverySlots,
    // Small result sets — keep as payload.find for depth-resolved relationships
    recentOrders,
    upcomingHolidays,
    lowStockResult,
    siteSettings,
  ] = await Promise.all([
    getRevenueSummary(payload, weekStart, weekEnd),
    getRevenueSummary(payload, prevWeekStart, prevWeekEnd),
    getStatusDistribution(payload),
    getCustomerMetrics(payload),
    getDailyRevenue(payload, weekStart, weekEnd),
    getTopProducts(payload),
    getNewMembersCount(payload, todayStart, todayEnd),
    getPendingCount(payload),
    getShippingCounts(payload),
    getDeliverySlotCounts(payload),
    payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 5,
      depth: 1,
    }),
    payload.find({
      collection: 'business-calendar',
      where: {
        and: [
          { date: { greater_than_equal: todayStart.toISOString() } },
          { date: { less_than: new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString() } },
          { or: [{ isHoliday: { equals: true } }, { shippingAvailable: { equals: false } }] },
        ],
      },
      sort: 'date',
      limit: 20,
    }),
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

  // Pad daily trend to full Mon–Sun week (SQL may return fewer days if week hasn't ended)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const dailyMap = new Map(weekDailyRevenue.map(d => [d.date, d]))
  const dailyTrend = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return dailyMap.get(dayStr) ?? { date: dayStr, orders: 0, revenue: 0 }
  })

  // Format recent orders
  const formattedRecentOrders = recentOrders.docs.map((order) => {
    const customer = order.customer as { id: string; name?: string; email: string } | null
    return {
      id: order.id as string,
      orderNumber: (order.orderNumber as string) || '',
      customerName: customer ? (customer.name || customer.email) : '-',
      totalAmount: (order.totalAmount as number) || 0,
      status: (order.status as string) || 'pending',
      createdAt: order.createdAt,
    }
  })

  // Format holidays
  const holidays = upcomingHolidays.docs.map((entry) => ({
    id: entry.id as string,
    date: entry.date as string,
    isHoliday: entry.isHoliday as boolean,
    shippingAvailable: entry.shippingAvailable as boolean,
    holidayReason: (entry.holidayReason as string) || '',
  }))

  function calcChangeRate(current: number, previous: number): number | null {
    if (previous === 0 && current === 0) return 0
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 1000) / 10
  }

  const statusCounts: Record<string, number> = {
    pending: statusDist.pending,
    awaiting_payment: statusDist.awaiting_payment,
    confirmed: statusDist.confirmed,
    preparing: statusDist.preparing,
    shipped: statusDist.shipped,
    delivered: statusDist.delivered,
    cancelled: statusDist.cancelled,
  }

  const initialData = {
    summary: {
      orderCount: weekRevenue.orderCount,
      revenue: weekRevenue.revenue,
      pendingCount,
      newUserCount: todayNewMembers,
      totalOrders: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      todayDeliveryCount: shipping.today,
      tomorrowDeliveryCount: shipping.tomorrow,
    },
    comparison: {
      prevRevenue: prevWeekRevenue.revenue,
      prevOrderCount: prevWeekRevenue.orderCount,
      revenueChangeRate: calcChangeRate(weekRevenue.revenue, prevWeekRevenue.revenue),
      orderChangeRate: calcChangeRate(weekRevenue.orderCount, prevWeekRevenue.orderCount),
      label: '前週比',
    },
    dailyTrend,
    recentOrders: formattedRecentOrders,
    statusCounts,
    upcomingHolidays: holidays,
    deliverySlotCounts: {
      morning: deliverySlots.morning,
      afternoon: deliverySlots.afternoon,
      evening: deliverySlots.evening,
      night: deliverySlots.night,
      unspecified: deliverySlots.unspecified,
    },
    lowStockProducts: lowStockResult.docs.map((p) => ({
      id: String(p.id),
      title: p.title as string,
      stock: (p.stock as number | null),
      lowStockThreshold: (p.lowStockThreshold as number | null | undefined),
    })),
    topProducts,
    quickStats: {
      conversionRate: await (async (): Promise<number | null> => {
        try {
          const propId = (siteSettings as { ga4PropertyId?: string })?.ga4PropertyId
          if (!propId) return null
          return await getConversionRate(
            propId,
            format(weekStart, 'yyyy-MM-dd'),
            format(todayEnd, 'yyyy-MM-dd'),
            weekRevenue.orderCount,
          )
        } catch { return null }
      })(),
      avgOrderValue: customerMetrics.avgOrderValue,
      repeatRate: customerMetrics.repeatRate,
      avgLTV: customerMetrics.avgLTV,
      newMembersCount: todayNewMembers,
    },
    period: {
      type: 'week',
      start: weekStart.toISOString(),
      end: todayEnd.toISOString(),
    },
  }

  return <DashboardClient initialData={initialData} />
}
