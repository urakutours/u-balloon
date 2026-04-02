/**
 * Dashboard SQL aggregation queries using Drizzle ORM
 *
 * Replaces payload.find() + JS-loop aggregation in the dashboard API route.
 * All queries run directly against PostgreSQL — no limit:2000 constraint.
 *
 * Table/column conventions (Payload v3 @payloadcms/db-postgres):
 *   collection slug  → table name (snake_case, e.g. "orders")
 *   camelCase field  → snake_case column (e.g. totalAmount → total_amount)
 *   relationship fld → {fieldName}_id column (e.g. customer → customer_id)
 *   array field      → separate table {parent}_{field} (e.g. orders_items)
 *     └ columns: _parent_id, _order, product_id, quantity, unit_price …
 *
 * execute() returns a node-postgres QueryResult: access rows via result.rows[N]
 */

import { sql } from 'drizzle-orm'
import type { Payload } from 'payload'

// ============================================================
// Helpers
// ============================================================

interface DrizzleExecute {
  execute(query: ReturnType<typeof sql>): Promise<{ rows: Record<string, unknown>[] }>
}

function db(payload: Payload): DrizzleExecute {
  return (payload.db as unknown as { drizzle: DrizzleExecute }).drizzle
}

// ============================================================
// 1. Revenue + order count for a period
// ============================================================

export interface RevenueSummary {
  revenue: number
  orderCount: number
}

export async function getRevenueSummary(
  payload: Payload,
  startDate: Date,
  endDate: Date,
): Promise<RevenueSummary> {
  const result = await db(payload).execute(sql`
    SELECT
      COALESCE(SUM(total_amount), 0)::numeric  AS revenue,
      COUNT(*)::int                             AS order_count
    FROM orders
    WHERE status::text != 'cancelled'
      AND created_at >= ${startDate.toISOString()}::timestamptz
      AND created_at <= ${endDate.toISOString()}::timestamptz
  `)
  const row = result.rows[0] as { revenue: string | null; order_count: number | null } | undefined
  return {
    revenue: Math.round(Number(row?.revenue ?? 0)),
    orderCount: Number(row?.order_count ?? 0),
  }
}

// ============================================================
// 2. Status distribution (all orders, no period filter)
// ============================================================

export interface StatusDistribution {
  pending: number
  awaiting_payment: number
  confirmed: number
  preparing: number
  shipped: number
  delivered: number
  cancelled: number
}

export async function getStatusDistribution(
  payload: Payload,
): Promise<StatusDistribution> {
  const result = await db(payload).execute(sql`
    SELECT status, COUNT(*)::int AS count
    FROM orders
    GROUP BY status
  `)

  const dist: StatusDistribution = {
    pending: 0, awaiting_payment: 0, confirmed: 0,
    preparing: 0, shipped: 0, delivered: 0, cancelled: 0,
  }

  for (const row of result.rows as Array<{ status: string; count: number }>) {
    const key = row.status as keyof StatusDistribution
    if (key in dist) dist[key] = Number(row.count) || 0
  }

  return dist
}

// ============================================================
// 3. Customer metrics: repeat rate, LTV, avg order value
//    Single query with CTE — no JS-side loop needed
// ============================================================

export interface CustomerMetrics {
  repeatRate: number    // %
  avgLTV: number        // 円
  avgOrderValue: number // 円
}

export async function getCustomerMetrics(
  payload: Payload,
): Promise<CustomerMetrics> {
  const result = await db(payload).execute(sql`
    WITH customer_stats AS (
      SELECT
        customer_id,
        COUNT(*)::int          AS order_count,
        SUM(total_amount)::numeric AS total_spent
      FROM orders
      WHERE status::text != 'cancelled'
        AND customer_id IS NOT NULL
      GROUP BY customer_id
    )
    SELECT
      COUNT(*)::int                                                    AS total_customers,
      COUNT(*) FILTER (WHERE order_count >= 2)::int                   AS repeat_customers,
      COALESCE(AVG(total_spent), 0)::numeric                          AS avg_ltv,
      COALESCE(
        (SELECT AVG(total_amount) FROM orders WHERE status::text != 'cancelled'),
        0
      )::numeric                                                       AS avg_order_value
    FROM customer_stats
  `)

  const row = result.rows[0] as {
    total_customers: number | null
    repeat_customers: number | null
    avg_ltv: string | null
    avg_order_value: string | null
  } | undefined

  const totalCustomers = Number(row?.total_customers ?? 0)
  const repeatCustomers = Number(row?.repeat_customers ?? 0)

  return {
    repeatRate: totalCustomers > 0
      ? Math.round((repeatCustomers / totalCustomers) * 1000) / 10
      : 0,
    avgLTV: Math.round(Number(row?.avg_ltv ?? 0)),
    avgOrderValue: Math.round(Number(row?.avg_order_value ?? 0)),
  }
}

// ============================================================
// 4. Daily revenue trend for chart
// ============================================================

export interface DailyRevenue {
  date: string   // 'yyyy-MM-dd'
  orders: number
  revenue: number
}

export async function getDailyRevenue(
  payload: Payload,
  startDate: Date,
  endDate: Date,
): Promise<DailyRevenue[]> {
  // Generate a complete date series so days with 0 orders still appear
  const result = await db(payload).execute(sql`
    WITH date_series AS (
      SELECT generate_series(
        ${startDate.toISOString()}::date,
        ${endDate.toISOString()}::date,
        '1 day'::interval
      )::date AS day
    )
    SELECT
      ds.day::text                         AS date,
      COALESCE(COUNT(o.id), 0)::int        AS orders,
      COALESCE(SUM(o.total_amount), 0)::numeric AS revenue
    FROM date_series ds
    LEFT JOIN orders o
      ON DATE(o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo') = ds.day
      AND o.status::text != 'cancelled'
    GROUP BY ds.day
    ORDER BY ds.day
  `)

  return (result.rows as Array<{ date: string; orders: number; revenue: string }>).map(row => ({
    date: row.date,
    orders: Number(row.orders) || 0,
    revenue: Math.round(Number(row.revenue) || 0),
  }))
}

// ============================================================
// 5. Top products by revenue (from orders_items join)
// ============================================================

export interface TopProduct {
  name: string
  salesCount: number
  revenue: number
}

export async function getTopProducts(
  payload: Payload,
  limit = 5,
): Promise<TopProduct[]> {
  const result = await db(payload).execute(sql`
    SELECT
      p.title                             AS name,
      SUM(oi.quantity)::int               AS sales_count,
      SUM(oi.unit_price * oi.quantity)::numeric AS revenue
    FROM orders_items oi
    JOIN orders o  ON o.id = oi._parent_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status::text != 'cancelled'
    GROUP BY p.id, p.title
    ORDER BY revenue DESC
    LIMIT ${limit}
  `)

  return (result.rows as Array<{ name: string; sales_count: number; revenue: string }>).map(row => ({
    name: row.name ?? '不明',
    salesCount: Number(row.sales_count) || 0,
    revenue: Math.round(Number(row.revenue) || 0),
  }))
}

// ============================================================
// 6. New members count within period
// ============================================================

export async function getNewMembersCount(
  payload: Payload,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const result = await db(payload).execute(sql`
    SELECT COUNT(*)::int AS count
    FROM users
    WHERE created_at >= ${startDate.toISOString()}::timestamptz
      AND created_at <= ${endDate.toISOString()}::timestamptz
  `)
  return Number((result.rows[0] as { count: number } | undefined)?.count ?? 0)
}

// ============================================================
// 7. Pending + awaiting_payment count (needs-attention badge)
// ============================================================

export async function getPendingCount(payload: Payload): Promise<number> {
  const result = await db(payload).execute(sql`
    SELECT COUNT(*)::int AS count
    FROM orders
    WHERE status::text IN ('pending', 'awaiting_payment')
  `)
  return Number((result.rows[0] as { count: number } | undefined)?.count ?? 0)
}

// ============================================================
// 8. Shipping counts for today and tomorrow
// ============================================================

export interface ShippingCounts {
  today: number
  tomorrow: number
}

export async function getShippingCounts(payload: Payload): Promise<ShippingCounts> {
  const result = await db(payload).execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE DATE(desired_arrival_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')
              = CURRENT_DATE AT TIME ZONE 'Asia/Tokyo'
      )::int AS today,
      COUNT(*) FILTER (
        WHERE DATE(desired_arrival_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')
              = (CURRENT_DATE AT TIME ZONE 'Asia/Tokyo') + INTERVAL '1 day'
      )::int AS tomorrow
    FROM orders
    WHERE status::text NOT IN ('cancelled', 'delivered')
      AND desired_arrival_date IS NOT NULL
  `)
  const row = result.rows[0] as { today: number | null; tomorrow: number | null } | undefined
  return {
    today: Number(row?.today ?? 0),
    tomorrow: Number(row?.tomorrow ?? 0),
  }
}

// ============================================================
// 9. Delivery time slot breakdown for today
// ============================================================

export interface DeliverySlotCounts {
  morning: number
  afternoon: number
  evening: number
  night: number
  unspecified: number
}

export async function getDeliverySlotCounts(payload: Payload): Promise<DeliverySlotCounts> {
  const result = await db(payload).execute(sql`
    SELECT
      COALESCE(desired_time_slot::text, 'unspecified') AS slot,
      COUNT(*)::int AS count
    FROM orders
    WHERE status::text NOT IN ('cancelled', 'delivered')
      AND DATE(desired_arrival_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')
          = CURRENT_DATE AT TIME ZONE 'Asia/Tokyo'
    GROUP BY desired_time_slot
  `)

  const counts: DeliverySlotCounts = { morning: 0, afternoon: 0, evening: 0, night: 0, unspecified: 0 }
  for (const row of result.rows as Array<{ slot: string; count: number }>) {
    const key = row.slot as keyof DeliverySlotCounts
    if (key in counts) counts[key] = Number(row.count) || 0
  }
  return counts
}
