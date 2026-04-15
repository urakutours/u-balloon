import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/site-settings'
import {
  calculateShippingForPlan,
  extractPrefecture,
  getActiveSortedPlans,
  getShippingPlanById,
  buildLegacyPlansFromOldSettings,
} from '@/lib/shipping'
import type { SiteSettingsData } from '@/lib/site-settings'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      destinationAddress,
      cartSubtotal = 0,
      productType,
      planId,
    }: {
      destinationAddress?: string
      cartSubtotal?: number
      productType?: 'standard' | 'delivery'
      planId?: string
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

    // distance_based プランが1件以上ある場合のみ Distance Matrix API を呼ぶ
    const anyDistanceBased = plans.some(p => p.calculationMethod === 'distance_based')
    let distanceKm: number | null = null
    let isMock = false

    if (anyDistanceBased) {
      const result = await fetchDistanceKm(settings, destinationAddress)
      distanceKm = result.distanceKm
      isMock = result.isMock
    }

    // planId 指定モード
    if (planId) {
      const p = getShippingPlanById(plans, planId)
      if (!p) {
        return NextResponse.json({ error: 'plan not found' }, { status: 404 })
      }
      const calc = calculateShippingForPlan({ plan: p, distanceKm, cartSubtotal, destinationPrefecture })
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
      })
    }

    // productType 指定モード（後方互換）
    if (productType === 'delivery' || productType === 'standard') {
      const preferred =
        productType === 'delivery'
          ? (plans.find(p => p.carrier === 'self_delivery') ?? plans[0])
          : (plans.find(p => p.carrier !== 'self_delivery') ?? plans[0])
      const calc = calculateShippingForPlan({ plan: preferred, distanceKm, cartSubtotal, destinationPrefecture })
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
      })
    }

    // 全プランモード（planId も productType も未指定）
    const results = plans.map(p => {
      const calc = calculateShippingForPlan({ plan: p, distanceKm, cartSubtotal, destinationPrefecture })
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
      }
    })

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
