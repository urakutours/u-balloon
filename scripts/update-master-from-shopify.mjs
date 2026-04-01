/**
 * uballoon-product-hub マスターJSON 最新化スクリプト
 *
 * Shopifyデータ（product-descriptions.json, metafields）を
 * uballoon-product-hub の master/products/*.json に反映する
 *
 * Usage:
 *   node scripts/update-master-from-shopify.mjs             # dry-run
 *   node scripts/update-master-from-shopify.mjs --execute   # 実行
 */

import fs from 'fs'

const MASTER_DIR = 'D:/dev/uballoon/uballoon-product-hub/master/products'
const DESCRIPTIONS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/docs/product-descriptions.json'
const METAFIELDS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/.secrets/backups/metafields_plan_20260306_220904.json'
const ALL_PRODUCTS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/docs/all-products.json'

const args = process.argv.slice(2)
const isExecute = args.includes('--execute')
const isDryRun = !isExecute

// データ読み込み
const descriptions = JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, 'utf-8'))
const metafields = JSON.parse(fs.readFileSync(METAFIELDS_PATH, 'utf-8'))
const allProducts = JSON.parse(fs.readFileSync(ALL_PRODUCTS_PATH, 'utf-8'))

const descBySku = new Map(descriptions.map(d => [d.sku, d.body_html]))
const shopifyBySku = new Map(allProducts.map(p => [p.variants?.[0]?.sku || p.handle, p]))

console.log('='.repeat(60))
console.log('  uballoon-product-hub マスターJSON 最新化')
console.log('='.repeat(60))
console.log(`  モード: ${isDryRun ? 'DRY RUN（確認のみ）' : 'EXECUTE（実行）'}`)
console.log(`  マスターディレクトリ: ${MASTER_DIR}`)
console.log('')

const masterFiles = fs.readdirSync(MASTER_DIR)
  .filter(f => f.endsWith('.json') && f !== 'original.json')

let descUpdated = 0
let optUpdated = 0
let skipped = 0

for (const filename of masterFiles) {
  const filePath = `${MASTER_DIR}/${filename}`
  let master

  try {
    master = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (err) {
    console.error(`  PARSE ERROR ${filename}: ${err.message}`)
    continue
  }

  const sku = master.sku
  if (!sku) { skipped++; continue }

  let changed = false
  const updates = []

  // --- description_html の更新 ---
  const newHtml = descBySku.get(sku)
  if (newHtml && master.description_html !== newHtml) {
    updates.push(`description_html: ${master.description_html?.length || 0}文字 → ${newHtml.length}文字`)
    master.description_html = newHtml
    changed = true
    descUpdated++
  }

  // --- options の更新（select_optionsのあるSKUのみ） ---
  const mf = metafields[sku]
  if (mf) {
    // Shopifyメタフィールドから options フォーマットに変換
    const newOptions = mf.metafields.map(m => ({
      name: m.name,
      field_type: 'select',
      required: false,
      values: m.values,
    }))

    // 既存のtextareaオプションは保持
    const existingTextOpts = (master.options || []).filter(
      o => o.field_type === 'textarea' || o.field_type === 'text'
    )

    const mergedOptions = [...newOptions, ...existingTextOpts]

    const oldSelectCount = (master.options || []).filter(
      o => o.field_type === 'select' || o.field_type === 'radio'
    ).length

    if (oldSelectCount !== newOptions.length ||
        JSON.stringify(master.options?.filter(o => o.field_type === 'select')) !==
        JSON.stringify(newOptions)) {
      updates.push(`options: select ${oldSelectCount}個 → ${newOptions.length}個 (${newOptions.map(o => `"${o.name}"(${o.values.length}択)`).join(', ')})`)
      master.options = mergedOptions
      changed = true
      optUpdated++
    }
  }

  if (!changed) {
    skipped++
    continue
  }

  if (isDryRun) {
    console.log(`  [DRY] ${sku}:`)
    updates.forEach(u => console.log(`    - ${u}`))
  } else {
    // metadata.updated_at を更新
    if (master.metadata) {
      master.metadata.updated_at = new Date().toISOString()
    }

    try {
      fs.writeFileSync(filePath, JSON.stringify(master, null, 2), 'utf-8')
      console.log(`  OK ${sku}: ${updates.join(' / ')}`)
    } catch (err) {
      console.error(`  ERROR ${sku}: ${err.message}`)
    }
  }
}

console.log('\n' + '='.repeat(60))
console.log('  完了')
console.log('='.repeat(60))
console.log(`  description_html更新: ${descUpdated}件`)
console.log(`  options更新: ${optUpdated}件`)
console.log(`  スキップ（変更なし）: ${skipped}件`)
if (isDryRun) {
  console.log('\n  実行するには --execute オプションを付けてください:')
  console.log('  node scripts/update-master-from-shopify.mjs --execute')
}
console.log('')
