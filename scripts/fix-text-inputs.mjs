/**
 * テキスト入力修正スクリプト
 * 1. メッセージカード文面の textInput を全削除
 * 2. 名入れ可能商品に「名入れ文字」textInput を追加
 * 3. マスターJSON を更新
 */

import pg from 'pg'
import crypto from 'crypto'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

function generatePayloadId() {
  return crypto.randomBytes(12).toString('hex')
}

const DRY_RUN = !process.argv.includes('--execute')

// 名入れ対象SKU — タイトルに「名入れ」を含む商品
const NAIRE_SKUS = [
  'g-opt-0011', // 名入れバルーン
  'g-opt-0015', // 名入れバルーン大
  'g-prf-0005', // 名入れできる！バルーンを自由に組み合わせ5
  'g-prf-0006', // 名入れできる！シャンパンバルーンと自由に組み合わせ6
  'g-prf-0007', // 名入れできる！メッセージ入りシャンパンバルーンと自由に組み合わせ7
  'g-prf-0011', // 名入れできる！ドールと名入れバルーン11
  'g-prf-0012', // 名入れできる！ドールと名入れバルーン12
  'g-prf-0013', // 名入れできる！選べるフリンジバルーン
  'g-prf-0014', // 名入れできる！選べる羽根入りフリンジバルーン14
  'g-prf-0015', // 名入れできる！ウェルカム装飾セット15
  'g-prf-0017', // 名入れできる！バルーンを自由に組み合わせ　人気キャラクター
]

async function main() {
  console.log('============================================================')
  console.log('  テキスト入力修正スクリプト')
  console.log('============================================================')
  console.log(`  モード: ${DRY_RUN ? 'DRY RUN（確認のみ）' : 'EXECUTE（実行）'}`)
  console.log('')

  let deletedCount = 0
  let addedCount = 0
  let errors = 0

  // ==========================================
  // Step 1: メッセージカード textInput を全削除
  // ==========================================
  console.log('【Step 1】メッセージカード textInput 削除')

  const existing = await pool.query(
    `SELECT COUNT(*) as cnt FROM products_custom_options_text_inputs
     WHERE name LIKE '%メッセージカード%' OR name LIKE '%文面%'`
  )
  const msgCount = parseInt(existing.rows[0].cnt)
  console.log(`  対象: ${msgCount} 件`)

  if (DRY_RUN) {
    console.log(`  [DRY] ${msgCount} 件削除予定`)
    deletedCount = msgCount
  } else {
    const result = await pool.query(
      `DELETE FROM products_custom_options_text_inputs
       WHERE name LIKE '%メッセージカード%' OR name LIKE '%文面%'`
    )
    deletedCount = result.rowCount
    console.log(`  OK ${deletedCount} 件削除`)
  }

  // ==========================================
  // Step 2: 名入れ textInput を追加
  // ==========================================
  console.log('\n【Step 2】名入れ textInput 追加')

  for (const sku of NAIRE_SKUS) {
    // 商品IDを取得
    const prod = await pool.query('SELECT id, title FROM products WHERE sku = $1', [sku])
    if (prod.rows.length === 0) {
      console.log(`  SKIP ${sku}: 商品が見つかりません`)
      continue
    }

    const productId = prod.rows[0].id
    const title = prod.rows[0].title

    // 既に名入れ textInput があるか確認
    const existingNaire = await pool.query(
      `SELECT id FROM products_custom_options_text_inputs
       WHERE _parent_id = $1 AND name LIKE '%名入れ%'`,
      [productId]
    )
    if (existingNaire.rows.length > 0) {
      console.log(`  SKIP ${sku}: 名入れ textInput 既存`)
      continue
    }

    // 既存の textInputs の最大 _order を取得
    const maxOrder = await pool.query(
      `SELECT COALESCE(MAX(_order), 0) as max_order
       FROM products_custom_options_text_inputs WHERE _parent_id = $1`,
      [productId]
    )
    const nextOrder = parseInt(maxOrder.rows[0].max_order) + 1

    const newId = generatePayloadId()

    if (DRY_RUN) {
      console.log(`  [DRY] ${sku}: 「名入れ文字」追加 (order: ${nextOrder})`)
      console.log(`         ${title.substring(0, 50)}`)
    } else {
      try {
        await pool.query(
          `INSERT INTO products_custom_options_text_inputs
           (id, _parent_id, _order, name, required, placeholder, price)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newId,
            productId,
            nextOrder,
            '名入れ文字',
            false,
            'バルーンに入れるお名前やメッセージをご記入ください',
            0,
          ]
        )
        console.log(`  OK ${sku}: 「名入れ文字」追加 (id: ${newId})`)
      } catch (err) {
        console.error(`  ERR ${sku}: ${err.message}`)
        errors++
      }
    }
    addedCount++
  }

  // ==========================================
  // Step 3: マスターJSON を更新
  // ==========================================
  console.log('\n【Step 3】マスターJSON 更新')

  const masterDir = 'D:/dev/uballoon/uballoon-product-hub/master/products/'

  // 3a. 全マスターJSONからメッセージカード textarea を削除
  const allFiles = fs.readdirSync(masterDir).filter((f) => f.endsWith('.json'))
  let masterMsgRemoved = 0

  for (const file of allFiles) {
    const filePath = masterDir + file
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

    if (data.options && Array.isArray(data.options)) {
      const before = data.options.length
      const filtered = data.options.filter(
        (o) => !(o.name && (o.name.includes('メッセージカード') || o.name.includes('文面')))
      )
      if (filtered.length < before) {
        if (DRY_RUN) {
          console.log(`  [DRY] ${data.sku}: メッセージカード option 削除 (${before} → ${filtered.length})`)
        } else {
          data.options = filtered
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
          console.log(`  OK ${data.sku}: メッセージカード option 削除 (${before} → ${filtered.length})`)
        }
        masterMsgRemoved++
      }
    }
  }
  console.log(`  メッセージカード削除: ${masterMsgRemoved} ファイル`)

  // 3b. 名入れ対象にtext_inputsを追加
  let masterNaireAdded = 0
  for (const sku of NAIRE_SKUS) {
    const filePath = masterDir + sku + '.json'
    if (!fs.existsSync(filePath)) continue

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

    // text_inputs フィールドを追加（まだなければ）
    if (!data.text_inputs) {
      data.text_inputs = []
    }

    const hasNaire = data.text_inputs.some((ti) => ti.name && ti.name.includes('名入れ'))
    if (hasNaire) {
      console.log(`  SKIP ${sku}: 名入れ既存`)
      continue
    }

    const naireInput = {
      name: '名入れ文字',
      required: false,
      placeholder: 'バルーンに入れるお名前やメッセージをご記入ください',
      price: 0,
    }

    if (DRY_RUN) {
      console.log(`  [DRY] ${sku}: text_inputs に「名入れ文字」追加`)
    } else {
      data.text_inputs.push(naireInput)
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
      console.log(`  OK ${sku}: text_inputs に「名入れ文字」追加`)
    }
    masterNaireAdded++
  }
  console.log(`  名入れ追加: ${masterNaireAdded} ファイル`)

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n============================================================')
  console.log('  完了')
  console.log('============================================================')
  console.log(`  メッセージカード削除（DB）: ${deletedCount} 件`)
  console.log(`  名入れ追加（DB）: ${addedCount} 件`)
  console.log(`  マスターJSON メッセージカード削除: ${masterMsgRemoved} ファイル`)
  console.log(`  マスターJSON 名入れ追加: ${masterNaireAdded} ファイル`)
  console.log(`  エラー: ${errors} 件`)

  if (DRY_RUN) {
    console.log('\n  実行するには --execute を付けてください:')
    console.log('  node scripts/fix-text-inputs.mjs --execute')
  }

  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
