/**
 * Shopifyデータ → Neon DB 復旧スクリプト
 *
 * Step 1: body_html を全451件 product-descriptions.json の新説明文で更新
 * Step 2: select_options を18件 metafields_plan から更新
 *
 * Usage:
 *   node scripts/restore-from-shopify.mjs             # dry-run
 *   node scripts/restore-from-shopify.mjs --execute   # 実行
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import pg from '../node_modules/pg/lib/index.js'

// Payload CMS の ID フォーマット（24文字hex）を生成
function generatePayloadId() {
  return crypto.randomBytes(12).toString('hex')
}

// ------------------------------------------------------------------
// 設定
// ------------------------------------------------------------------
const DESCRIPTIONS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/docs/product-descriptions.json'
const METAFIELDS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/.secrets/backups/metafields_plan_20260306_220904.json'

const args = process.argv.slice(2)
const isExecute = args.includes('--execute')
const isDryRun = !isExecute

// Load .env
const envPath = path.resolve(import.meta.dirname, '../.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL not set')

// ------------------------------------------------------------------
// データ読み込み
// ------------------------------------------------------------------
const descriptions = JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, 'utf-8'))
const metafields = JSON.parse(fs.readFileSync(METAFIELDS_PATH, 'utf-8'))

// SKU → 説明文マップ
const descBySku = new Map(descriptions.map(d => [d.sku, d.body_html]))

console.log('='.repeat(60))
console.log('  Shopify → Neon DB 復旧スクリプト')
console.log('='.repeat(60))
console.log(`  モード: ${isDryRun ? 'DRY RUN（確認のみ）' : 'EXECUTE（実行）'}`)
console.log(`  説明文データ: ${descriptions.length}件`)
console.log(`  選択項目データ: ${Object.keys(metafields).length}件`)
console.log('')

// ------------------------------------------------------------------
// DB接続
// ------------------------------------------------------------------
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
await client.connect()

// ------------------------------------------------------------------
// Step 1: body_html 全件更新
// ------------------------------------------------------------------
console.log('【Step 1】body_html 更新')
console.log('-'.repeat(60))

const dbProducts = await client.query('SELECT id, sku, body_html FROM products ORDER BY sku')
let step1Updated = 0
let step1Skipped = 0
let step1Errors = 0

for (const row of dbProducts.rows) {
  const newHtml = descBySku.get(row.sku)
  if (!newHtml) {
    console.log(`  SKIP ${row.sku}: 説明文データなし`)
    step1Skipped++
    continue
  }

  if (row.body_html === newHtml) {
    step1Skipped++
    continue
  }

  if (isDryRun) {
    const oldLen = row.body_html?.length || 0
    const newLen = newHtml.length
    console.log(`  [DRY] ${row.sku}: ${oldLen}文字 → ${newLen}文字`)
    step1Updated++
  } else {
    try {
      await client.query(
        'UPDATE products SET body_html = $1, updated_at = NOW() WHERE id = $2',
        [newHtml, row.id]
      )
      step1Updated++
      if (step1Updated % 50 === 0) {
        console.log(`  ... ${step1Updated}/${dbProducts.rows.length} 更新済み`)
      }
    } catch (err) {
      console.error(`  ERROR ${row.sku}: ${err.message?.slice(0, 100)}`)
      step1Errors++
    }
  }
}

console.log(`  → 更新: ${step1Updated}件, スキップ: ${step1Skipped}件, エラー: ${step1Errors}件`)

// ------------------------------------------------------------------
// Step 2: select_options 更新（18件）
// ------------------------------------------------------------------
console.log('\n【Step 2】select_options 更新')
console.log('-'.repeat(60))

// SKU → DBのproduct.id マップ作成
const productIdMap = new Map(dbProducts.rows.map(r => [r.sku, r.id]))

let step2Updated = 0
let step2Errors = 0

for (const [sku, data] of Object.entries(metafields)) {
  const productId = productIdMap.get(sku)
  if (!productId) {
    console.log(`  SKIP ${sku}: DBに商品なし`)
    continue
  }

  const mfs = data.metafields || []
  if (mfs.length === 0) continue

  if (isDryRun) {
    console.log(`  [DRY] ${sku}: ${mfs.length}個のselect_optionを設定`)
    mfs.forEach(mf => {
      console.log(`    - "${mf.name}": ${mf.values.length}択`)
    })
    step2Updated++
    continue
  }

  try {
    // 既存のchoices → select_options を削除
    const existingOpts = await client.query(
      'SELECT id FROM products_custom_options_select_options WHERE _parent_id = $1',
      [productId]
    )
    for (const opt of existingOpts.rows) {
      await client.query(
        'DELETE FROM products_custom_options_select_options_choices WHERE _parent_id = $1',
        [opt.id]
      )
    }
    await client.query(
      'DELETE FROM products_custom_options_select_options WHERE _parent_id = $1',
      [productId]
    )

    // 新しい select_options を挿入
    for (let optIdx = 0; optIdx < mfs.length; optIdx++) {
      const mf = mfs[optIdx]

      const optId = generatePayloadId()
      await client.query(
        `INSERT INTO products_custom_options_select_options
           (id, _order, _parent_id, name, required)
         VALUES ($1, $2, $3, $4, $5)`,
        [optId, optIdx + 1, productId, mf.name, false]
      )

      // choices を挿入
      for (let choiceIdx = 0; choiceIdx < mf.values.length; choiceIdx++) {
        const choiceId = generatePayloadId()
        await client.query(
          `INSERT INTO products_custom_options_select_options_choices
             (id, _order, _parent_id, label, additional_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [choiceId, choiceIdx + 1, optId, mf.values[choiceIdx], 0]
        )
      }
    }

    console.log(`  OK ${sku}: ${mfs.map(m => `"${m.name}"(${m.values.length}択)`).join(', ')}`)
    step2Updated++
  } catch (err) {
    console.error(`  ERROR ${sku}: ${err.message?.slice(0, 150)}`)
    step2Errors++
  }
}

console.log(`  → 更新: ${step2Updated}件, エラー: ${step2Errors}件`)

// ------------------------------------------------------------------
// 完了
// ------------------------------------------------------------------
await client.end()

console.log('\n' + '='.repeat(60))
console.log('  完了')
console.log('='.repeat(60))
console.log(`  body_html更新: ${step1Updated}件`)
console.log(`  select_options更新: ${step2Updated}件`)
if (isDryRun) {
  console.log('\n  実行するには --execute オプションを付けてください:')
  console.log('  node scripts/restore-from-shopify.mjs --execute')
}
console.log('')
