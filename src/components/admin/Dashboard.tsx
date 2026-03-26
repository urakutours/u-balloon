import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { format, startOfDay, endOfDay } from 'date-fns'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  const payload = await getPayload({ config })

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const [
    todayOrders,
    pendingOrders,
    recentOrders,
    todayUsers,
    upcomingHolidays,
    allOrdersForStats,
  ] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: {
        createdAt: {
          greater_than_equal: todayStart.toISOString(),
          less_than: todayEnd.toISOString(),
        },
      },
      limit: 500,
      sort: 'createdAt',
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      where: { status: { equals: 'pending' } },
      limit: 0,
    }),
    payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 5,
      depth: 1,
    }),
    payload.find({
      collection: 'users',
      where: {
        createdAt: {
          greater_than_equal: todayStart.toISOString(),
          less_than: todayEnd.toISOString(),
        },
      },
      limit: 0,
    }),
    payload.find({
      collection: 'business-calendar',
      where: {
        and: [
          { date: { greater_than_equal: todayStart.toISOString() } },
          {
            date: {
              less_than: new Date(
                todayStart.getTime() + 14 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          },
          {
            or: [
              { isHoliday: { equals: true } },
              { shippingAvailable: { equals: false } },
            ],
          },
        ],
      },
      sort: 'date',
      limit: 20,
    }),
    payload.find({
      collection: 'orders',
      limit: 0,
    }),
  ])

  // Revenue
  const revenue = todayOrders.docs.reduce(
    (sum, order) => sum + ((order.totalAmount as number) || 0),
    0,
  )

  // Status counts
  const statusCounts: Record<string, number> = {
    pending: 0, confirmed: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0,
  }
  for (const order of allOrdersForStats.docs) {
    const s = order.status as string
    if (s in statusCounts) statusCounts[s]++
  }

  // Daily trend (today only = 1 point)
  const todayStr = format(todayStart, 'yyyy-MM-dd')
  const dailyTrend = [{
    date: todayStr,
    orders: todayOrders.docs.length,
    revenue,
  }]

  // Format recent orders
  const formattedRecentOrders = recentOrders.docs.map((order) => {
    const customer = order.customer as {
      id: string
      name?: string
      email: string
    } | null
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

  const initialData = {
    summary: {
      orderCount: todayOrders.totalDocs,
      revenue,
      pendingCount: pendingOrders.totalDocs,
      newUserCount: todayUsers.totalDocs,
      totalOrders: allOrdersForStats.totalDocs,
    },
    dailyTrend,
    recentOrders: formattedRecentOrders,
    statusCounts,
    upcomingHolidays: holidays,
    period: {
      type: 'today',
      start: todayStart.toISOString(),
      end: todayEnd.toISOString(),
    },
  }

  return <DashboardClient initialData={initialData} />
}
