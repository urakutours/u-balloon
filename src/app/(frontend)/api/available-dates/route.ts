import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  fetchBusinessCalendarMap,
  isBusinessDay,
  addBusinessDays,
  formatDateStr,
} from '@/lib/business-calendar'

type AvailableDatesRequest = {
  startDate: string
  endDate: string
  productType: 'standard' | 'delivery'
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

    const calendarMap = await fetchBusinessCalendarMap(
      payload,
      formatDateStr(calendarStart),
      formatDateStr(calendarEnd),
    )

    // 最短営業日数
    const requiredDays = productType === 'standard' ? 3 : 5
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const earliestDate = addBusinessDays(today, requiredDays, calendarMap)
    const earliestDateStr = formatDateStr(earliestDate)

    // 利用可能日一覧を生成
    const start = parseDate(startDate)
    const end = parseDate(endDate)
    const availableDates: string[] = []

    const current = new Date(start)
    while (current <= end) {
      const dateStr = formatDateStr(current)
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
