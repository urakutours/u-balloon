import { NextRequest, NextResponse } from 'next/server'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers: req.headers })
    if (!user || (user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const kind = searchParams.get('kind') ?? 'orders'
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const ALLOWED_KINDS = ['revenue', 'orders', 'pending', 'shipping-today'] as const
    type AllowedKind = (typeof ALLOWED_KINDS)[number]
    if (!ALLOWED_KINDS.includes(kind as AllowedKind)) {
      return NextResponse.json({ error: '不正な kind パラメータです' }, { status: 400 })
    }
    if (from && Number.isNaN(Date.parse(from))) {
      return NextResponse.json({ error: '不正な from 日付です' }, { status: 400 })
    }
    if (to && Number.isNaN(Date.parse(to))) {
      return NextResponse.json({ error: '不正な to 日付です' }, { status: 400 })
    }

    type OrderDoc = {
      id: string
      orderNumber?: string | null
      customer?: { id: string; name?: string; email?: string } | null
      totalAmount?: number | null
      status?: string | null
      createdAt: string
      desiredArrivalDate?: string | null
      desiredTimeSlot?: string | null
    }

    let whereClause: Where

    if (kind === 'pending') {
      whereClause = {
        status: { in: ['pending', 'awaiting_payment'] },
      }
    } else if (kind === 'shipping-today') {
      const todayJST = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }),
      )
      const todayStart = startOfDay(todayJST).toISOString()
      const todayEnd = endOfDay(todayJST).toISOString()
      whereClause = {
        and: [
          { desiredArrivalDate: { greater_than_equal: todayStart } },
          { desiredArrivalDate: { less_than_equal: todayEnd } },
          { status: { in: ['confirmed', 'preparing'] } },
        ],
      }
    } else {
      // revenue | orders — period filter
      const periodWhere: Where[] = [
        { status: { not_equals: 'cancelled' } },
      ]
      if (from) {
        periodWhere.push({ createdAt: { greater_than_equal: startOfDay(new Date(from)).toISOString() } })
      }
      if (to) {
        periodWhere.push({ createdAt: { less_than_equal: endOfDay(new Date(to)).toISOString() } })
      }
      whereClause = { and: periodWhere }
    }

    const sortField =
      kind === 'shipping-today' ? 'desiredTimeSlot' : '-createdAt'

    const result = await payload.find({
      collection: 'orders',
      where: whereClause,
      sort: sortField,
      limit: 50,
      depth: 1,
    })

    const orders = result.docs.map((doc) => {
      const d = doc as unknown as OrderDoc
      const customer = d.customer ?? null
      return {
        id: String(d.id),
        orderNumber: d.orderNumber ?? '',
        customerName: customer
          ? (customer.name || customer.email || '-')
          : '-',
        totalAmount: d.totalAmount ?? 0,
        status: d.status ?? 'pending',
        createdAt: d.createdAt,
        desiredArrivalDate: d.desiredArrivalDate ?? null,
        desiredTimeSlot: d.desiredTimeSlot ?? null,
      }
    })

    return NextResponse.json({ orders, totalCount: result.totalDocs })
  } catch (err) {
    console.error('[dashboard/orders] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '注文データの取得に失敗しました' }, { status: 500 })
  }
}
