import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from 'date-fns'

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
    case 'custom':
      periodStart = customStart ? startOfDay(new Date(customStart)) : startOfDay(now)
      periodEnd = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now)
      break
    default: // today
      periodStart = startOfDay(now)
      periodEnd = endOfDay(now)
  }

  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const [
    periodOrders,
    pendingOrders,
    recentOrders,
    periodUsers,
    upcomingHolidays,
    allOrdersForStats,
  ] = await Promise.all([
    // Period orders
    payload.find({
      collection: 'orders',
      where: {
        createdAt: {
          greater_than_equal: periodStart.toISOString(),
          less_than_equal: periodEnd.toISOString(),
        },
      },
      limit: 500,
      sort: 'createdAt',
      depth: 0,
    }),
    // Pending orders count
    payload.find({
      collection: 'orders',
      where: { status: { equals: 'pending' } },
      limit: 0,
    }),
    // Recent 5 orders
    payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 5,
      depth: 1,
    }),
    // Period new users
    payload.find({
      collection: 'users',
      where: {
        createdAt: {
          greater_than_equal: periodStart.toISOString(),
          less_than_equal: periodEnd.toISOString(),
        },
      },
      limit: 0,
    }),
    // Upcoming holidays (next 14 days)
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
    // All orders for status counts
    payload.find({
      collection: 'orders',
      limit: 0,
    }),
  ])

  // Calculate summary
  const revenue = periodOrders.docs.reduce(
    (sum, order) => sum + ((order.totalAmount as number) || 0),
    0,
  )

  // Status counts
  const statusCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    preparing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  }
  for (const order of allOrdersForStats.docs) {
    const s = order.status as string
    if (s in statusCounts) statusCounts[s]++
  }

  // Daily trend data
  const days = eachDayOfInterval({ start: periodStart, end: periodEnd })
  const dailyTrend = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayOrders = periodOrders.docs.filter((o) => {
      const orderDate = format(new Date(o.createdAt), 'yyyy-MM-dd')
      return orderDate === dayStr
    })
    return {
      date: dayStr,
      orders: dayOrders.length,
      revenue: dayOrders.reduce(
        (sum, o) => sum + ((o.totalAmount as number) || 0),
        0,
      ),
    }
  })

  // Format recent orders for client
  const formattedRecentOrders = recentOrders.docs.map((order) => {
    const customer = order.customer as {
      id: string
      name?: string
      email: string
    } | null
    return {
      id: order.id,
      orderNumber: order.orderNumber as string,
      customerName: customer ? (customer.name || customer.email) : '-',
      totalAmount: order.totalAmount as number,
      status: order.status as string,
      createdAt: order.createdAt,
    }
  })

  // Format holidays
  const holidays = upcomingHolidays.docs.map((entry) => ({
    id: entry.id,
    date: entry.date as string,
    isHoliday: entry.isHoliday as boolean,
    shippingAvailable: entry.shippingAvailable as boolean,
    holidayReason: (entry.holidayReason as string) || '',
  }))

  return NextResponse.json({
    summary: {
      orderCount: periodOrders.totalDocs,
      revenue,
      pendingCount: pendingOrders.totalDocs,
      newUserCount: periodUsers.totalDocs,
      totalOrders: allOrdersForStats.totalDocs,
    },
    dailyTrend,
    recentOrders: formattedRecentOrders,
    statusCounts,
    upcomingHolidays: holidays,
    period: {
      type: period,
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
  })
}
