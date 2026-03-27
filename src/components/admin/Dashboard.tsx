import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { format, startOfDay, endOfDay, addDays, startOfWeek, eachDayOfInterval } from 'date-fns'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  const payload = await getPayload({ config })

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const tomorrowEnd = endOfDay(addDays(now, 1))
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start

  const [
    todayOrders,
    pendingOrders,
    recentOrders,
    todayUsers,
    upcomingHolidays,
    // Status count queries — one per status for accuracy
    pendingCount,
    confirmedCount,
    preparingCount,
    shippedCount,
    deliveredCount,
    cancelledCount,
    awaitingPaymentCount,
    // Today's deliveries
    todayDeliveries,
    tomorrowDeliveries,
    totalOrders,
    weekOrders,
    lowStockResult,
  ] = await Promise.all([
    // Today's orders
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
    // Pending orders (needs attention)
    payload.find({
      collection: 'orders',
      where: {
        or: [
          { status: { equals: 'pending' } },
          { status: { equals: 'confirmed' } },
        ],
      },
      limit: 0,
    }),
    // Recent orders
    payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 5,
      depth: 1,
    }),
    // Today's new users
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
    // Upcoming holidays
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
    // Individual status counts (fix: limit:0 only returns totalDocs correctly)
    payload.find({ collection: 'orders', where: { status: { equals: 'pending' } }, limit: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'confirmed' } }, limit: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'preparing' } }, limit: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'shipped' } }, limit: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'delivered' } }, limit: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'cancelled' } }, limit: 0 }),
    payload.find({ collection: 'orders', where: { status: { equals: 'awaiting_payment' } }, limit: 0 }),
    // Today's deliveries (orders with desiredArrivalDate = today)
    payload.find({
      collection: 'orders',
      where: {
        and: [
          {
            desiredArrivalDate: {
              greater_than_equal: todayStart.toISOString(),
            },
          },
          {
            desiredArrivalDate: {
              less_than: todayEnd.toISOString(),
            },
          },
          {
            status: {
              not_equals: 'cancelled',
            },
          },
        ],
      },
      limit: 100,
      depth: 1,
      sort: 'desiredTimeSlot',
    }),
    // Tomorrow's deliveries
    payload.find({
      collection: 'orders',
      where: {
        and: [
          {
            desiredArrivalDate: {
              greater_than_equal: todayEnd.toISOString(),
            },
          },
          {
            desiredArrivalDate: {
              less_than: tomorrowEnd.toISOString(),
            },
          },
          {
            status: {
              not_equals: 'cancelled',
            },
          },
        ],
      },
      limit: 0,
    }),
    // Total orders count
    payload.find({ collection: 'orders', limit: 0 }),
    // This week's orders
    payload.find({
      collection: 'orders',
      where: {
        createdAt: {
          greater_than_equal: weekStart.toISOString(),
          less_than: todayEnd.toISOString(),
        },
      },
      limit: 500,
      sort: 'createdAt',
      depth: 0,
    }),
    // Low stock products
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
  ])

  // Revenue (week)
  const revenue = weekOrders.docs.reduce(
    (sum, order) => sum + ((order.totalAmount as number) || 0),
    0,
  )

  // Status counts (using individual queries)
  const statusCounts: Record<string, number> = {
    pending: pendingCount.totalDocs,
    awaiting_payment: awaitingPaymentCount.totalDocs,
    confirmed: confirmedCount.totalDocs,
    preparing: preparingCount.totalDocs,
    shipped: shippedCount.totalDocs,
    delivered: deliveredCount.totalDocs,
    cancelled: cancelledCount.totalDocs,
  }

  // Today's delivery time slot breakdown
  const TIME_SLOTS = ['morning', 'afternoon', 'evening', 'night'] as const
  const deliverySlotCounts: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
    unspecified: 0,
  }
  for (const order of todayDeliveries.docs) {
    const slot = order.desiredTimeSlot as string
    if (slot && slot in deliverySlotCounts) {
      deliverySlotCounts[slot]++
    } else {
      deliverySlotCounts.unspecified++
    }
  }

  // Daily trend (this week)
  const weekDays = eachDayOfInterval({ start: weekStart, end: todayStart })
  const dailyTrend = weekDays.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayOrders = weekOrders.docs.filter((o) => {
      const orderDate = format(new Date(o.createdAt), 'yyyy-MM-dd')
      return orderDate === dayStr
    })
    const dayRevenue = dayOrders.reduce(
      (sum, order) => sum + ((order.totalAmount as number) || 0),
      0,
    )
    return { date: dayStr, orders: dayOrders.length, revenue: dayRevenue }
  })

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
      orderCount: weekOrders.totalDocs,
      revenue,
      pendingCount: pendingOrders.totalDocs,
      newUserCount: todayUsers.totalDocs,
      totalOrders: totalOrders.totalDocs,
      todayDeliveryCount: todayDeliveries.totalDocs,
      tomorrowDeliveryCount: tomorrowDeliveries.totalDocs,
    },
    dailyTrend,
    recentOrders: formattedRecentOrders,
    statusCounts,
    upcomingHolidays: holidays,
    deliverySlotCounts,
    lowStockProducts: lowStockResult.docs.map((p) => ({
      id: String(p.id),
      title: p.title as string,
      stock: (p.stock as number | null),
      lowStockThreshold: (p.lowStockThreshold as number | null | undefined),
    })),
    period: {
      type: 'week',
      start: weekStart.toISOString(),
      end: todayEnd.toISOString(),
    },
  }

  return <DashboardClient initialData={initialData} />
}
