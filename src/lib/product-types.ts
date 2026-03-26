/**
 * 商品タイプ判定ロジック
 * Shopify uballoon-tokyo-shopify のLiquidロジックをTypeScriptに移植
 */

export type BalloonProductType =
  | 'release'     // バルーンリリース（g-alm系、リリースタグ）
  | 'option'      // オプション商品（g-opt-系、オプションタグ）
  | 'helium-gas'  // ヘリウムガス補充缶（g-mat-0043）
  | 'customize'   // カスタマイズ商品（g-prf-系）
  | 'okigata'     // 置き型バルーン（置き型タグ）
  | 'floating'    // デフォルト: ヘリウム浮遊型

export type ProductTypeInfo = {
  type: BalloonProductType
  isRelease: boolean
  isOption: boolean
  isHeliumGas: boolean
  isCustomize: boolean
  isOkigata: boolean
  isFloating: boolean
}

/**
 * SKUとタグから商品タイプを判定する
 */
export function detectProductType(sku: string | undefined | null, tags: string[]): ProductTypeInfo {
  const s = sku || ''
  const tagSet = new Set(tags.map((t) => t.toLowerCase()))

  let isRelease = tagSet.has('リリース')
  let isOption = tagSet.has('オプション') && s.startsWith('g-opt-')
  let isHeliumGas = s === 'g-mat-0043'
  let isCustomize = tagSet.has('カスタマイズ')
  let isOkigata = tagSet.has('置き型')

  // g-prf- prefix or g-alm-0051 → customize (overrides okigata)
  if (s.startsWith('g-prf-') || s === 'g-alm-0051') {
    isCustomize = true
    isOkigata = false
  }

  // Determine primary type
  let type: BalloonProductType = 'floating'
  if (isRelease) type = 'release'
  else if (isOption) type = 'option'
  else if (isHeliumGas) type = 'helium-gas'
  else if (isCustomize) type = 'customize'
  else if (isOkigata) type = 'okigata'

  const isFloating = type === 'floating'

  return { type, isRelease, isOption, isHeliumGas, isCustomize, isOkigata, isFloating }
}

/**
 * ヘリウムバナーを表示するかどうか判定する
 */
export function shouldShowHeliumBanner(sku: string | undefined | null, typeInfo: ProductTypeInfo): {
  showRecommend: boolean
  showPartial: boolean
} {
  const s = sku || ''

  // リリース・オプション・ヘリウムガス・置き型は表示しない
  if (typeInfo.isRelease || typeInfo.isOption || typeInfo.isHeliumGas || typeInfo.isOkigata) {
    return { showRecommend: false, showPartial: false }
  }

  // 特定SKUは非表示
  const excludedSkus = [
    'g-alm-0033', 'g-alm-0034',
    'g-prf-0013', 'g-prf-0014', 'g-prf-0019', 'g-prf-0020',
    'g-opt-0008', 'g-opt-0015',
  ]
  if (excludedSkus.includes(s)) {
    return { showRecommend: false, showPartial: false }
  }

  // g-prf-0015 は部分表示
  if (s === 'g-prf-0015') {
    return { showRecommend: false, showPartial: true }
  }

  return { showRecommend: true, showPartial: false }
}
