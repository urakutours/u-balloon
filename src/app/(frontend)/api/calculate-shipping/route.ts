import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings, type SiteSettingsData } from '@/lib/site-settings'

type ShippingRequest = {
  destinationAddress: string
  productType: 'standard' | 'delivery'
  cartSubtotal: number
}

/**
 * Google Maps Distance Matrix API を使って距離を取得
 * API KEY未設定時は10kmの固定値を返す
 */
async function getDistanceKm(
  destination: string,
  origin: string,
  apiKey: string | null,
): Promise<{ distanceKm: number; isMock: boolean }> {
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
 * 送料計算ロジック — 料金パラメータは SiteSettings から取得
 */
function calculateShippingFee(
  distanceKm: number,
  productType: 'standard' | 'delivery',
  cartSubtotal: number,
  settings: SiteSettingsData,
): { shippingFee: number; breakdown: string } {
  const perKmFee = settings.shippingExtraPerKmFee ?? 200

  if (productType === 'standard') {
    const baseFee = settings.shippingStandardBaseFee ?? 1200
    const freeKm = settings.shippingStandardFreeDistanceKm ?? 5

    if (distanceKm <= freeKm) {
      return {
        shippingFee: baseFee,
        breakdown: `基本料 ¥${baseFee.toLocaleString()}（${distanceKm}km / ${freeKm}km以内）`,
      }
    }
    const excessKm = distanceKm - freeKm
    const excessFee = excessKm * perKmFee
    const total = baseFee + excessFee
    return {
      shippingFee: total,
      breakdown: `基本料 ¥${baseFee.toLocaleString()} + 超過${excessKm}km × ¥${perKmFee} = ¥${total.toLocaleString()}`,
    }
  }

  // デリバリー限定商品
  const baseFee = settings.shippingDeliveryBaseFee ?? 4500
  const freeKm = settings.shippingDeliveryFreeDistanceKm ?? 10
  const freeThreshold = settings.shippingDeliveryFreeThreshold ?? 30000

  if (distanceKm <= freeKm) {
    if (freeThreshold > 0 && cartSubtotal >= freeThreshold) {
      return {
        shippingFee: 0,
        breakdown: `送料無料（商品合計 ¥${cartSubtotal.toLocaleString()} ≥ ¥${freeThreshold.toLocaleString()} / ${distanceKm}km / ${freeKm}km以内）`,
      }
    }
    return {
      shippingFee: baseFee,
      breakdown: `基本料 ¥${baseFee.toLocaleString()}（${distanceKm}km / ${freeKm}km以内）`,
    }
  }

  // 無料距離超過
  const excessKm = distanceKm - freeKm
  const excessFee = excessKm * perKmFee

  if (freeThreshold > 0 && cartSubtotal >= freeThreshold) {
    return {
      shippingFee: excessFee,
      breakdown: `基本料無料（¥${freeThreshold.toLocaleString()}以上）+ 超過${excessKm}km × ¥${perKmFee} = ¥${excessFee.toLocaleString()}`,
    }
  }

  const total = baseFee + excessFee
  return {
    shippingFee: total,
    breakdown: `基本料 ¥${baseFee.toLocaleString()} + 超過${excessKm}km × ¥${perKmFee} = ¥${total.toLocaleString()}`,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ShippingRequest = await req.json()
    const { destinationAddress, productType, cartSubtotal } = body

    if (!destinationAddress) {
      return NextResponse.json({ error: 'destinationAddress は必須です' }, { status: 400 })
    }
    if (!productType || !['standard', 'delivery'].includes(productType)) {
      return NextResponse.json({ error: 'productType は standard または delivery を指定してください' }, { status: 400 })
    }
    if (cartSubtotal === undefined || cartSubtotal < 0) {
      return NextResponse.json({ error: 'cartSubtotal は0以上の数値を指定してください' }, { status: 400 })
    }

    const settings = await getSiteSettings()
    const origin = settings.shippingOriginAddress || '東京都港区'
    const apiKey = settings.googleMapsApiKey || null
    const { distanceKm, isMock } = await getDistanceKm(destinationAddress, origin, apiKey)
    const { shippingFee, breakdown } = calculateShippingFee(distanceKm, productType, cartSubtotal, settings)

    return NextResponse.json({
      distanceKm,
      shippingFee,
      breakdown,
      ...(isMock ? { note: 'Google Maps APIキー未設定のためモックデータ（10km固定）を使用' } : {}),
    })
  } catch (err) {
    console.error('[Shipping] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '送料計算に失敗しました' },
      { status: 500 },
    )
  }
}
