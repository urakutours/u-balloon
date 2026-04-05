import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/site-settings'

// 起点: 東京都港区（uballoon拠点）
const ORIGIN = '東京都港区'

type ShippingRequest = {
  destinationAddress: string
  productType: 'standard' | 'delivery'
  cartSubtotal: number
}

/**
 * Google Maps Distance Matrix API を使って距離を取得
 * API KEY未設定時は10kmの固定値を返す
 */
async function getDistanceKm(destination: string, apiKey: string | null): Promise<{ distanceKm: number; isMock: boolean }> {
  if (!apiKey) {
    console.log('[Shipping] Google Maps APIキー未設定 → モックモード (10km固定)')
    return { distanceKm: 10, isMock: true }
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
    url.searchParams.set('origins', ORIGIN)
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
 * 送料計算ロジック
 */
function calculateShippingFee(
  distanceKm: number,
  productType: 'standard' | 'delivery',
  cartSubtotal: number,
): { shippingFee: number; breakdown: string } {
  if (productType === 'standard') {
    // 通常商品
    // 5km以内: 基本料1,200円
    // 5km超過: 1,200円 + (超過km × 200円)
    const baseFee = 1200
    if (distanceKm <= 5) {
      return {
        shippingFee: baseFee,
        breakdown: `基本料 ¥${baseFee.toLocaleString()}（${distanceKm}km / 5km以内）`,
      }
    }
    const excessKm = distanceKm - 5
    const excessFee = excessKm * 200
    const total = baseFee + excessFee
    return {
      shippingFee: total,
      breakdown: `基本料 ¥${baseFee.toLocaleString()} + 超過${excessKm}km × ¥200 = ¥${total.toLocaleString()}`,
    }
  }

  // デリバリー限定商品
  const baseFee = 4500

  if (distanceKm <= 10) {
    // 10km以内: 基本料4,500円 (30,000円以上で送料無料)
    if (cartSubtotal >= 30000) {
      return {
        shippingFee: 0,
        breakdown: `送料無料（商品合計 ¥${cartSubtotal.toLocaleString()} ≥ ¥30,000 / ${distanceKm}km / 10km以内）`,
      }
    }
    return {
      shippingFee: baseFee,
      breakdown: `基本料 ¥${baseFee.toLocaleString()}（${distanceKm}km / 10km以内）`,
    }
  }

  // 10km超過
  const excessKm = distanceKm - 10
  const excessFee = excessKm * 200

  if (cartSubtotal >= 30000) {
    // 送料無料は10km以内のみ。超過分は必ず発生
    return {
      shippingFee: excessFee,
      breakdown: `基本料無料（¥30,000以上）+ 超過${excessKm}km × ¥200 = ¥${excessFee.toLocaleString()}`,
    }
  }

  const total = baseFee + excessFee
  return {
    shippingFee: total,
    breakdown: `基本料 ¥${baseFee.toLocaleString()} + 超過${excessKm}km × ¥200 = ¥${total.toLocaleString()}`,
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
    const apiKey = settings.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || null
    const { distanceKm, isMock } = await getDistanceKm(destinationAddress, apiKey)
    const { shippingFee, breakdown } = calculateShippingFee(distanceKm, productType, cartSubtotal)

    return NextResponse.json({
      distanceKm,
      shippingFee,
      breakdown,
      ...(isMock ? { note: 'GOOGLE_MAPS_API_KEY未設定のためモックデータ（10km固定）を使用' } : {}),
    })
  } catch (err) {
    console.error('[Shipping] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '送料計算に失敗しました' },
      { status: 500 },
    )
  }
}
