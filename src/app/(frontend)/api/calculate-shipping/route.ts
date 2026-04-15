import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getSiteSettings } from '@/lib/site-settings'
import {
  calculateShippingForPlan,
  extractPrefecture,
  getActiveSortedPlans,
  getShippingPlanById,
  buildLegacyPlansFromOldSettings,
} from '@/lib/shipping'
import type { SiteSettingsData } from '@/lib/site-settings'
import {
  fetchBusinessCalendarMap,
  previousBusinessDay,
  nextBusinessDay,
  formatDateStr,
} from '@/lib/business-calendar'

/**
 * Google Maps Distance Matrix API を使って距離を取得
 * API KEY未設定時または失敗時は10kmの固定値を返す
 */
async function fetchDistanceKm(
  settings: SiteSettingsData,
  destination: string,
): Promise<{ distanceKm: number; isMock: boolean }> {
  const origin = settings.shippingOriginAddress || '東京都港区'
  const apiKey = settings.googleMapsApiKey || null

  if (!apiKey) {
    console.log('[Shipping] Google Maps APIキー未設定 → モックモード (10km固定)')
    return { distanceKm: 10, isMock: true }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', origin)
    url.searchParams.set('destinations', destination)
    url.searchParams.set('mode', 'driving')
    url.searchParams.set('language', 'ja')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    const data = await res.json()

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
      console.error('[Shipping] Distance Matrix API error:', data.status)
      return { distanceKm: 10, isMock: true }
    }

    const element = data.rows[0].elements[0]
    if (element.status !== 'OK') {
      console.error('[Shipping] Element error:', element.status)
      return { distanceKm: 10, isMock: true }
    }

    // distance.value はメートル単位
    const distanceKm = Math.ceil(element.distance.value / 1000)
    return { distanceKm, isMock: false }
  } catch (err) {
    console.error('[Shipping] Distance Matrix API fetch error:', err)
    return { distanceKm: 10, isMock: true }
  }
}

/**
 * 暫定 shipDate（YYYY-MM-DD）を受け取り、BusinessCalendar で営業日補正した日付を返す。
 *
 * - 非営業日なら previousBusinessDay で直前営業日に寄せる
 * - estimatedDaysMin === 0（当日配送）の特例: today の翌営業日を下限とする
 */
async function computeScheduledShipDate(
  desiredArrivalDate: string,
  estimatedDaysMin: number,
): Promise<string> {
  // カレンダー取得範囲: 前後 60 日
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const desired = parseLocalDate(desiredArrivalDate)

  const rangeFrom = new Date(today)
  rangeFrom.setDate(rangeFrom.getDate() - 1)
  const rangeTo = new Date(desired)
  rangeTo.setDate(rangeTo.getDate() + 1)

  let calendarMap
  try {
    const payload = await getPayload({ config })
    calendarMap = await fetchBusinessCalendarMap(
      payload,
      formatDateStr(rangeFrom),
      formatDateStr(rangeTo),
    )
  } catch {
    // Payload 取得失敗時は空 Map で継続（非営業日補正なし、regression しない）
    calendarMap = new Map()
  }

  if (estimatedDaysMin === 0) {
    // 当日配送: 発送予定日 = 到着希望日の前日を起点にするが、today の翌営業日を下限とする
    const prevDay = new Date(desired)
    prevDay.setDate(prevDay.getDate() - 1)
    const adjusted = previousBusinessDay(prevDay, calendarMap)

    // today 翌営業日（= 最早発送可能日）を下限として Math.max
    const todayPlusOne = new Date(today)
    todayPlusOne.setDate(todayPlusOne.getDate() + 1)
    const lowerBound = nextBusinessDay(todayPlusOne, calendarMap)

    return adjusted >= lowerBound ? formatDateStr(adjusted) : formatDateStr(lowerBound)
  }

  // 通常ケース: desiredArrivalDate - estimatedDaysMin 日 → previousBusinessDay で補正
  const tentative = new Date(desired)
  tentative.setDate(tentative.getDate() - estimatedDaysMin)
  const adjusted = previousBusinessDay(tentative, calendarMap)
  return formatDateStr(adjusted)
}

/** YYYY-MM-DD を UTC ズレなしでパースする */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      destinationAddress,
      cartSubtotal = 0,
      productType,
      planId,
      desiredArrivalDate,
    }: {
      destinationAddress?: string
      cartSubtotal?: number
      productType?: 'standard' | 'delivery'
      planId?: string
      desiredArrivalDate?: string
    } = body

    if (!destinationAddress) {
      return NextResponse.json({ error: 'destinationAddress は必須です' }, { status: 400 })
    }

    const settings = await getSiteSettings()

    // 取得可能なプランリスト
    let plans = getActiveSortedPlans(settings.shippingPlans)
    if (plans.length === 0) {
      // fallback: 旧フィールドから生成
      plans = buildLegacyPlansFromOldSettings(settings)
    }

    if (plans.length === 0) {
      return NextResponse.json({ error: 'No shipping plans configured' }, { status: 500 })
    }

    const destinationPrefecture = extractPrefecture(destinationAddress)

    // 対象プランを先に絞り込む（planId > productType > 全プラン）
    // そのうえで distance_based が含まれている場合だけ Distance Matrix API を呼ぶ
    let targetPlans: typeof plans
    if (planId) {
      const p = getShippingPlanById(plans, planId)
      if (!p) {
        return NextResponse.json({ error: 'plan not found' }, { status: 404 })
      }
      targetPlans = [p]
    } else if (productType === 'delivery' || productType === 'standard') {
      const preferred =
        productType === 'delivery'
          ? (plans.find(p => p.carrier === 'self_delivery') ?? plans[0])
          : (plans.find(p => p.carrier !== 'self_delivery') ?? plans[0])
      targetPlans = [preferred]
    } else {
      targetPlans = plans
    }

    const anyDistanceBased = targetPlans.some(p => p.calculationMethod === 'distance_based')
    let distanceKm: number | null = null
    let isMock = false

    if (anyDistanceBased) {
      const result = await fetchDistanceKm(settings, destinationAddress)
      distanceKm = result.distanceKm
      isMock = result.isMock
    }

    // planId 指定モード（targetPlans は 1 件確定）
    if (planId) {
      const p = targetPlans[0]
      const calc = calculateShippingForPlan({ plan: p, distanceKm, cartSubtotal, destinationPrefecture })

      let scheduledShipDate: string | undefined
      if (desiredArrivalDate && calc.eligible) {
        scheduledShipDate = await computeScheduledShipDate(
          desiredArrivalDate,
          p.estimatedDaysMin ?? 0,
        )
      }

      return NextResponse.json({
        shippingFee: calc.shippingFee,
        distanceKm,
        breakdown: calc.breakdown,
        shippingPlan: {
          id: p.id ?? null,
          name: p.name,
          carrier: p.carrier,
          estimatedDaysMin: p.estimatedDaysMin,
          estimatedDaysMax: p.estimatedDaysMax,
        },
        isMock,
        eligible: calc.eligible,
        reason: calc.reason ?? null,
        scheduledShipDate: scheduledShipDate ?? null,
      })
    }

    // productType 指定モード（後方互換、targetPlans は 1 件確定）
    if (productType === 'delivery' || productType === 'standard') {
      const preferred = targetPlans[0]
      const calc = calculateShippingForPlan({ plan: preferred, distanceKm, cartSubtotal, destinationPrefecture })

      let scheduledShipDate: string | undefined
      if (desiredArrivalDate && calc.eligible) {
        scheduledShipDate = await computeScheduledShipDate(
          desiredArrivalDate,
          preferred.estimatedDaysMin ?? 0,
        )
      }

      return NextResponse.json({
        shippingFee: calc.shippingFee,
        distanceKm,
        breakdown: calc.breakdown,
        shippingPlan: {
          id: preferred.id ?? null,
          name: preferred.name,
          carrier: preferred.carrier,
          estimatedDaysMin: preferred.estimatedDaysMin,
          estimatedDaysMax: preferred.estimatedDaysMax,
        },
        isMock,
        eligible: calc.eligible,
        reason: calc.reason ?? null,
        scheduledShipDate: scheduledShipDate ?? null,
      })
    }

    // 全プランモード（planId も productType も未指定）
    const results = await Promise.all(
      plans.map(async (p) => {
        const calc = calculateShippingForPlan({ plan: p, distanceKm, cartSubtotal, destinationPrefecture })

        let scheduledShipDate: string | undefined
        if (desiredArrivalDate && calc.eligible) {
          scheduledShipDate = await computeScheduledShipDate(
            desiredArrivalDate,
            p.estimatedDaysMin ?? 0,
          )
        }

        return {
          planId: p.id ?? null,
          planName: p.name,
          carrier: p.carrier,
          estimatedDaysMin: p.estimatedDaysMin,
          estimatedDaysMax: p.estimatedDaysMax,
          shippingFee: calc.shippingFee,
          distanceKm,
          eligible: calc.eligible,
          reason: calc.reason ?? null,
          breakdown: calc.breakdown,
          scheduledShipDate: scheduledShipDate ?? null,
        }
      }),
    )

    return NextResponse.json({
      plans: results,
      distanceKm,
      isMock,
      destinationPrefecture,
    })
  } catch (err) {
    console.error('[Shipping] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '送料計算に失敗しました' },
      { status: 500 },
    )
  }
}
