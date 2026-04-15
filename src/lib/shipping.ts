import type { ShippingPlan, SiteSettingsData } from './site-settings'

// ─── Types ───────────────────────────────────────────────────────────────

export type ShippingCalcInput = {
  plan: ShippingPlan
  distanceKm: number | null // Google Maps で計算された実距離。null 可（計算不能時）
  cartSubtotal: number // 商品合計（送料無料閾値判定用）
  destinationPrefecture: string | null // 住所から抽出した都道府県（regional_table 用）
}

export type ShippingCalcResult = {
  shippingFee: number
  eligible: boolean
  reason?: string
  breakdown: {
    method: ShippingPlan['calculationMethod']
    baseFee?: number
    extraDistanceKm?: number
    extraFee?: number
    regionalFee?: number
    freeThresholdApplied?: boolean
    freeDistanceApplied?: boolean
  }
}

// ─── 1. Main calculator ────────────────────────────────────────────────

/**
 * 単一の配送プランに対して送料を計算する純関数。
 * distanceKm が null のとき distance_based プランは eligible: false になる。
 */
export function calculateShippingForPlan(input: ShippingCalcInput): ShippingCalcResult {
  const { plan, distanceKm, cartSubtotal, destinationPrefecture } = input

  // 配送不可エリア判定（文字列に都道府県が含まれていれば除外）
  if (plan.restrictedAreas && destinationPrefecture) {
    const areas = plan.restrictedAreas.split(/[,、\s]+/).map(s => s.trim()).filter(Boolean)
    if (areas.some(a => destinationPrefecture.includes(a) || a.includes(destinationPrefecture))) {
      return {
        shippingFee: 0,
        eligible: false,
        reason: `${destinationPrefecture}は配送不可エリアです`,
        breakdown: { method: plan.calculationMethod },
      }
    }
  }

  // 対応エリア判定（supportedAreas が特定の都道府県を列挙している場合のみ whitelist として機能。
  // 「全国」が含まれていれば whitelist チェックをスキップ）
  if (plan.supportedAreas && destinationPrefecture && !plan.supportedAreas.includes('全国')) {
    const allowed = extractAllPrefectures(plan.supportedAreas)
    if (allowed.length > 0 && !allowed.some(a => destinationPrefecture === a)) {
      return {
        shippingFee: 0,
        eligible: false,
        reason: `${plan.name}は${plan.supportedAreas}のみ対応のため、${destinationPrefecture}は対象外です`,
        breakdown: { method: plan.calculationMethod },
      }
    }
  }

  // 送料無料閾値判定
  if (plan.freeThreshold && plan.freeThreshold > 0 && cartSubtotal >= plan.freeThreshold) {
    return {
      shippingFee: 0,
      eligible: true,
      breakdown: { method: plan.calculationMethod, freeThresholdApplied: true },
    }
  }

  // 計算方法別ロジック
  switch (plan.calculationMethod) {
    case 'free':
      return { shippingFee: 0, eligible: true, breakdown: { method: 'free' } }

    case 'flat':
      return {
        shippingFee: plan.baseFee ?? 0,
        eligible: true,
        breakdown: { method: 'flat', baseFee: plan.baseFee ?? 0 },
      }

    case 'distance_based': {
      if (distanceKm == null) {
        return {
          shippingFee: 0,
          eligible: false,
          reason: '距離計算ができませんでした',
          breakdown: { method: 'distance_based' },
        }
      }
      const base = plan.baseFee ?? 0
      const freeKm = plan.freeDistanceKm ?? 0
      const perKm = plan.extraPerKmFee ?? 0
      const extraDistance = Math.max(0, distanceKm - freeKm)
      // 端数 km × 単価 → 円単位で切り上げ（距離側で ceil すると端数 km × perKm 分が過大になる）
      const extraFee = Math.ceil(extraDistance * perKm)
      const freeDistanceApplied = distanceKm <= freeKm
      return {
        shippingFee: base + extraFee,
        eligible: true,
        breakdown: {
          method: 'distance_based',
          baseFee: base,
          extraDistanceKm: Number(extraDistance.toFixed(2)),
          extraFee,
          freeDistanceApplied,
        },
      }
    }

    case 'regional_table': {
      if (!destinationPrefecture) {
        return {
          shippingFee: 0,
          eligible: false,
          reason: '配送先の都道府県を特定できませんでした',
          breakdown: { method: 'regional_table' },
        }
      }
      const match = plan.regionalFees.find(r =>
        destinationPrefecture.includes(r.region) || r.region.includes(destinationPrefecture)
      )
      if (!match) {
        return {
          shippingFee: 0,
          eligible: false,
          reason: `${destinationPrefecture}の料金設定がありません`,
          breakdown: { method: 'regional_table' },
        }
      }
      return {
        shippingFee: match.fee,
        eligible: true,
        breakdown: { method: 'regional_table', regionalFee: match.fee },
      }
    }

    default:
      return {
        shippingFee: 0,
        eligible: false,
        reason: `未対応の計算方法: ${plan.calculationMethod}`,
        breakdown: { method: plan.calculationMethod },
      }
  }
}

// ─── 2. Helper: 都道府県の抽出 ──────────────────────────────────────────

const PREFECTURE_REGEX = /(東京都|北海道|(?:京都|大阪)府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県)/
const PREFECTURE_REGEX_GLOBAL = new RegExp(PREFECTURE_REGEX.source, 'g')

export function extractPrefecture(address: string | null | undefined): string | null {
  if (!address) return null
  const m = address.match(PREFECTURE_REGEX)
  return m ? m[1] : null
}

export function extractAllPrefectures(text: string | null | undefined): string[] {
  if (!text) return []
  const matches = text.match(PREFECTURE_REGEX_GLOBAL)
  return matches ? Array.from(new Set(matches)) : []
}

// ─── 3. Plan selection ─────────────────────────────────────────────────

export function getActiveSortedPlans(plans: ShippingPlan[] | null | undefined): ShippingPlan[] {
  if (!plans) return []
  return [...plans].filter(p => p.active).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function getShippingPlanById(
  plans: ShippingPlan[] | null | undefined,
  id: string | null | undefined,
): ShippingPlan | null {
  if (!plans || !id) return null
  return plans.find(p => p.id === id) ?? null
}

// ─── 4. Legacy 設定 → shippingPlans 変換 (seed 用) ────────────────────

/**
 * 旧フィールド (shippingStandardBaseFee 等) から shippingPlans 相当の配列を構築する。
 * seed スクリプトや calculate-shipping API の fallback で使う。
 */
export function buildLegacyPlansFromOldSettings(settings: SiteSettingsData): ShippingPlan[] {
  const plans: ShippingPlan[] = []

  // 通常配送
  if (settings.shippingStandardBaseFee != null) {
    plans.push({
      id: 'legacy-standard',
      name: '通常配送',
      carrier: 'yamato',
      calculationMethod: 'distance_based',
      baseFee: settings.shippingStandardBaseFee,
      freeDistanceKm: settings.shippingStandardFreeDistanceKm ?? 0,
      extraPerKmFee: settings.shippingExtraPerKmFee ?? 0,
      freeThreshold: null,
      regionalFees: [],
      availableTimeSlots: [],
      estimatedDaysMin: 2,
      estimatedDaysMax: 4,
      supportedAreas: '全国（沖縄・離島を除く）',
      restrictedAreas: settings.shippingRestrictedAreas ?? null,
      active: true,
      sortOrder: 10,
      notes: '（旧設定からの自動変換）',
    })
  }

  // u-balloon デリバリー便
  if (settings.shippingDeliveryBaseFee != null) {
    plans.push({
      id: 'legacy-delivery',
      name: 'u-balloon デリバリー便',
      carrier: 'self_delivery',
      calculationMethod: 'distance_based',
      baseFee: settings.shippingDeliveryBaseFee,
      freeDistanceKm: settings.shippingDeliveryFreeDistanceKm ?? 0,
      extraPerKmFee: settings.shippingExtraPerKmFee ?? 0,
      freeThreshold: settings.shippingDeliveryFreeThreshold ?? null,
      regionalFees: [],
      availableTimeSlots: [],
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      supportedAreas: '東京都内',
      restrictedAreas: null,
      active: true,
      sortOrder: 20,
      notes: '（旧設定からの自動変換・自社配送）',
    })
  }

  return plans
}
