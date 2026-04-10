import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toCsv } from '@/lib/csv-utils'

const STATUS_LABELS: Record<string, string> = {
  pending: '保留中',
  awaiting_payment: '入金待ち',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
  night: '夜',
}
const CARRIER_LABELS: Record<string, string> = {
  yamato: 'ヤマト運輸',
  yupack: 'ゆうパック',
  sagawa: '佐川急便',
  other: 'その他',
}
const PAYMENT_LABELS: Record<string, string> = {
  stripe: 'クレジットカード',
  bank_transfer: '銀行振込',
}

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const format = searchParams.get('format') || 'csv'
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('from') || ''
  const dateTo = searchParams.get('to') || ''
  const limitParam = parseInt(searchParams.get('limit') || '0')

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {}
  const andClauses = []
  if (status) andClauses.push({ status: { equals: status } })
  if (dateFrom) andClauses.push({ createdAt: { greater_than_equal: new Date(dateFrom).toISOString() } })
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    andClauses.push({ createdAt: { less_than_equal: end.toISOString() } })
  }
  if (andClauses.length > 0) where.and = andClauses

  const result = await payload.find({
    collection: 'orders',
    depth: 2,
    limit: limitParam || 10000,
    where: Object.keys(where).length > 0 ? where : undefined,
    sort: '-createdAt',
  })

  if (format === 'json') {
    return Response.json(result.docs)
  }

  // Build flat rows — one row per order item
  const rows: Record<string, unknown>[] = []

  for (const order of result.docs) {
    const customer = order.customer as Record<string, unknown> | null
    const items = (order.items as Array<Record<string, unknown>>) || []
    const tracking = order.trackingInfo as Record<string, unknown> | null

    const base: Record<string, unknown> = {
      注文番号: order.orderNumber,
      注文日時: order.createdAt ? new Date(order.createdAt as string).toLocaleString('ja-JP') : '',
      ステータス: STATUS_LABELS[(order.status as string) || ''] || order.status,
      顧客ID: customer?.id ?? '',
      顧客名: customer?.name ?? '',
      顧客メール: customer?.email ?? '',
      電話番号: customer?.phone ?? '',
      配送先住所: order.deliveryAddress ?? '',
      到着希望日: order.desiredArrivalDate
        ? new Date(order.desiredArrivalDate as string).toLocaleDateString('ja-JP')
        : '',
      希望時間帯: TIME_SLOT_LABELS[(order.desiredTimeSlot as string) || ''] || '',
      小計: order.subtotal ?? 0,
      割引額: order.discountAmount ?? 0,
      使用ポイント: order.pointsUsed ?? 0,
      付与ポイント: order.pointsEarned ?? 0,
      送料: order.shippingFee ?? 0,
      合計金額: order.totalAmount ?? 0,
      支払い方法: PAYMENT_LABELS[(order.paymentMethod as string) || ''] || order.paymentMethod,
      配送業者: CARRIER_LABELS[(tracking?.carrier as string) || ''] || (tracking?.carrier ?? ''),
      追跡番号: tracking?.trackingNumber ?? '',
      備考: order.notes ?? '',
    }

    if (items.length === 0) {
      rows.push({ ...base, 商品名: '', 数量: '', 単価: '' })
    } else {
      for (const item of items) {
        const product = item.product as Record<string, unknown> | null
        rows.push({
          ...base,
          商品名: product?.title ?? (typeof item.product === 'string' ? item.product : ''),
          数量: item.quantity ?? '',
          単価: item.unitPrice ?? '',
        })
      }
    }
  }

  const columns = [
    { key: '注文番号', label: '注文番号' },
    { key: '注文日時', label: '注文日時' },
    { key: 'ステータス', label: 'ステータス' },
    { key: '顧客ID', label: '顧客ID' },
    { key: '顧客名', label: '顧客名' },
    { key: '顧客メール', label: '顧客メール' },
    { key: '電話番号', label: '電話番号' },
    { key: '配送先住所', label: '配送先住所' },
    { key: '到着希望日', label: '到着希望日' },
    { key: '希望時間帯', label: '希望時間帯' },
    { key: '商品名', label: '商品名' },
    { key: '数量', label: '数量' },
    { key: '単価', label: '単価（円）' },
    { key: '小計', label: '小計（円）' },
    { key: '割引額', label: '割引額（円）' },
    { key: '使用ポイント', label: '使用ポイント' },
    { key: '付与ポイント', label: '付与ポイント' },
    { key: '送料', label: '送料（円）' },
    { key: '合計金額', label: '合計金額（円）' },
    { key: '支払い方法', label: '支払い方法' },
    { key: '配送業者', label: '配送業者' },
    { key: '追跡番号', label: '追跡番号' },
    { key: '備考', label: '備考' },
  ]

  const csv = toCsv(rows, columns)
  const filename = `orders_${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
