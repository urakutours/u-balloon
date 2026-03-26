import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

type AvailableDatesRequest = {
  startDate: string
  endDate: string
  productType: 'standard' | 'delivery'
}

/**
 * 指定日が営業日かどうかを判定
 * BusinessCalendarにレコードがない日 = 営業日扱い
 * レコードがあり shippingAvailable=false → 非営業日
 */
function isBusinessDay(
  dateStr: string,
  calendarMap: Map<string, { isHoliday: boolean; shippingAvailable: boolean }>,
): boolean {
  const entry = calendarMap.get(dateStr)
  if (!entry) return true // 登録なし = 営業日
  return entry.shippingAvailable !== false
}

/**
 * 今日からN営業日後の日付を計算
 */
function getEarliestDate(
  today: Date,
  requiredBusinessDays: number,
  calendarMap: Map<string, { isHoliday: boolean; shippingAvailable: boolean }>,
): Date {
  let count = 0
  const current = new Date(today)

  while (count < requiredBusinessDays) {
    current.setDate(current.getDate() + 1)
    const dateStr = formatDate(current)
    if (isBusinessDay(dateStr, calendarMap)) {
      count++
    }
  }

  return current
}

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export async function POST(req: NextRequest) {
  try {
    const body: AvailableDatesRequest = await req.json()
    const { startDate, endDate, productType } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate と endDate は必須です' }, { status: 400 })
    }
    if (!productType || !['standard', 'delivery'].includes(productType)) {
      return NextResponse.json({ error: 'productType は standard または delivery を指定してください' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // 指定期間 + 余裕（最短日計算のため前後30日）のカレンダーを取得
    const calendarStart = new Date(parseDate(startDate))
    calendarStart.setDate(calendarStart.getDate() - 30)
    const calendarEnd = new Date(parseDate(endDate))
    calendarEnd.setDate(calendarEnd.getDate() + 1)

    const calendarEntries = await payload.find({
      collection: 'business-calendar',
      where: {
        date: {
          greater_than_equal: formatDate(calendarStart),
          less_than_equal: formatDate(calendarEnd),
        },
      },
      limit: 500,
      sort: 'date',
    })

    // カレンダーデータをMapに変換
    const calendarMap = new Map<string, { isHoliday: boolean; shippingAvailable: boolean }>()
    for (const entry of calendarEntries.docs) {
      // dateフィールドはISO文字列なのでYYYY-MM-DD部分を抽出
      const dateStr = (entry.date as string).substring(0, 10)
      calendarMap.set(dateStr, {
        isHoliday: entry.isHoliday as boolean,
        shippingAvailable: entry.shippingAvailable as boolean,
      })
    }

    // 最短営業日数
    const requiredDays = productType === 'standard' ? 3 : 5
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const earliestDate = getEarliestDate(today, requiredDays, calendarMap)
    const earliestDateStr = formatDate(earliestDate)

    // 利用可能日一覧を生成
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    const availableDates: string[] = []

    const current = new Date(start)
    while (current <= end) {
      const dateStr = formatDate(current)
      // 最短日以降 かつ 営業日 であれば利用可能
      if (dateStr >= earliestDateStr && isBusinessDay(dateStr, calendarMap)) {
        availableDates.push(dateStr)
      }
      current.setDate(current.getDate() + 1)
    }

    return NextResponse.json({
      availableDates,
      earliestDate: earliestDateStr,
      productType,
      requiredBusinessDays: requiredDays,
    })
  } catch (err) {
    console.error('[AvailableDates] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '利用可能日の取得に失敗しました' },
      { status: 500 },
    )
  }
}
