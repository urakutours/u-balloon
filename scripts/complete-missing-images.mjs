/**
 * 不足画像 一括完成スクリプト
 *
 * 対象: DB に1枚しかない18件の商品の追加画像
 * 処理:
 *   1. BD.com フォルダから uballoon-product-hub/images/{dir}/ にコピー
 *   2. Cloudflare R2 にアップロード
 *   3. media テーブルに登録
 *   4. products_images テーブルにリンク
 *   5. マスター JSON の images フィールドを更新
 *   6. registry.json を更新
 *
 * Usage:
 *   node scripts/complete-missing-images.mjs             # dry-run
 *   node scripts/complete-missing-images.mjs --execute   # 実行
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '../node_modules/@aws-sdk/client-s3/dist-cjs/index.js'
import pg from '../node_modules/pg/lib/index.js'

// ------------------------------------------------------------------
// 設定
// ------------------------------------------------------------------
const SOURCE_BASE   = 'G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com'
const HUB_IMAGES    = 'D:/dev/uballoon/uballoon-product-hub/images'
const HUB_MASTER    = 'D:/dev/uballoon/uballoon-product-hub/master/products'
const REGISTRY_PATH = 'D:/dev/uballoon/uballoon-product-hub/images/registry.json'
const MEDIA_URL_BASE = 'https://uballoon-edge.urakutours.workers.dev'

// ソースフォルダ検索順
const ALL_SOURCE_DIRS = ['gift', 'delivery', 'option', 'party', 'prix fixe', '追加']

// ハブ内のフォルダ名（スペースなしに統一）
const DIR_MAP = {
  'gift': 'gift',
  'delivery': 'delivery',
  'option': 'option',
  'party': 'party',
  'prix fixe': 'prix_fixe',
  '追加': 'extra',
}

// 対象 SKU（追加画像があることが確認済み）
const TARGET_SKUS = [
  'g-btd-0013',
  'g-gwl-0011','g-gwl-0012','g-gwl-0013','g-gwl-0014','g-gwl-0015',
  'g-gwl-0016','g-gwl-0017','g-gwl-0019','g-gwl-0020','g-gwl-0026',
  'g-mtr-0009','g-mtr-0012',
  'g-prf-0020',
  'g-rec-0033',
  'g-wed-0049',
  'g-xms-0025','g-xms-0026',
]

// ------------------------------------------------------------------
// CLI & env
// ------------------------------------------------------------------
const args = process.argv.slice(2)
const isExecute = args.includes('--execute')
const isDryRun = !isExecute

const envPath = path.resolve(import.meta.dirname, '../.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

function generateId() { return crypto.randomBytes(12).toString('hex') }

// ------------------------------------------------------------------
// 画像検索
// ------------------------------------------------------------------
function findSource(filename) {
  for (const dir of ALL_SOURCE_DIRS) {
    const p = path.join(SOURCE_BASE, dir, filename)
    if (fs.existsSync(p)) return { sourceDir: dir, sourcePath: p }
  }
  return null
}

// JPEG から画像サイズを読み取る
function getJpegSize(buf) {
  for (let i = 0; i < buf.length - 12; i++) {
    if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
      return { width: (buf[i+7] << 8) | buf[i+8], height: (buf[i+5] << 8) | buf[i+6] }
    }
  }
  return { width: null, height: null }
}

// ------------------------------------------------------------------
// メイン
// ------------------------------------------------------------------
console.log('='.repeat(60))
console.log('  不足画像 一括完成スクリプト')
console.log('='.repeat(60))
console.log(`  モード: ${isDryRun ? 'DRY RUN（確認のみ）' : 'EXECUTE（実行）'}`)
console.log('')

const dbClient = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
await dbClient.connect()

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
const BUCKET = process.env.R2_BUCKET

// registry.json の読み込み
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))

let totalCopied = 0, totalUploaded = 0, totalLinked = 0, totalErrors = 0
const registryUpdates = {}  // sku -> { directory, primary, additional[] }
const masterUpdates = {}    // sku -> images[]

for (const sku of TARGET_SKUS) {
  // ローカルの全画像ファイルを収集
  const allFiles = []
  let sourceDir = null
  for (const dir of ALL_SOURCE_DIRS) {
    const dirPath = path.join(SOURCE_BASE, dir)
    if (!fs.existsSync(dirPath)) continue
    const files = fs.readdirSync(dirPath)
      .filter(f => f.toLowerCase().startsWith(sku) && f.toLowerCase().endsWith('.jpg'))
      .sort()
    if (files.length > 0) {
      sourceDir = dir
      files.forEach(f => allFiles.push({ filename: f, sourcePath: path.join(dirPath, f), sourceDir: dir }))
    }
  }

  const extraFiles = allFiles.filter(f => f.filename.includes('__'))
  if (extraFiles.length === 0) {
    console.log(`SKIP ${sku}: 追加画像なし`)
    continue
  }

  // product id 取得
  const prodRes = await dbClient.query('SELECT id FROM products WHERE sku = $1', [sku])
  const productId = prodRes.rows[0]?.id
  if (!productId) { console.log(`SKIP ${sku}: DB商品なし`); continue }

  const hubDir = DIR_MAP[sourceDir] || sourceDir
  const hubDirPath = path.join(HUB_IMAGES, hubDir)

  // 現在の_order最大値
  const orderRes = await dbClient.query(
    'SELECT MAX(_order) as max_order FROM products_images WHERE _parent_id = $1',
    [productId]
  )
  let currentOrder = orderRes.rows[0]?.max_order || 0

  console.log(`\n${sku} (${sourceDir} → hub:${hubDir}, 追加${extraFiles.length}枚):`)

  // registry / master 用のデータ収集
  const masterImages = []
  const regAdditional = []

  // メイン画像も master JSON 用に記録
  const mainFile = allFiles.find(f => !f.filename.includes('__'))
  if (mainFile) {
    masterImages.push({
      filename: mainFile.filename,
      position: 1,
      alt: '',
      directory: hubDir,
    })
  }

  for (let i = 0; i < extraFiles.length; i++) {
    const imgFile = extraFiles[i]
    const { filename, sourcePath } = imgFile

    if (isDryRun) {
      currentOrder++
      console.log(`  [DRY] ${filename} → hub:${hubDir}/ | R2 | order:${currentOrder}`)
      totalCopied++; totalUploaded++; totalLinked++
      masterImages.push({ filename, position: i + 2, alt: '', directory: hubDir })
      regAdditional.push(filename)
      continue
    }

    try {
      // 1. hub にコピー
      if (!fs.existsSync(hubDirPath)) fs.mkdirSync(hubDirPath, { recursive: true })
      const hubFilePath = path.join(hubDirPath, filename)
      if (!fs.existsSync(hubFilePath)) {
        fs.copyFileSync(sourcePath, hubFilePath)
        totalCopied++
      }

      // 2. R2 アップロード
      let alreadyInR2 = false
      try {
        await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: filename }))
        alreadyInR2 = true
      } catch {}

      if (!alreadyInR2) {
        const buf = fs.readFileSync(sourcePath)
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: filename, Body: buf, ContentType: 'image/jpeg',
        }))
        totalUploaded++
      }

      // 3. media テーブル登録（未登録の場合のみ）
      const existing = await dbClient.query('SELECT id FROM media WHERE filename = $1', [filename])
      let mediaId
      if (existing.rows.length > 0) {
        mediaId = existing.rows[0].id
      } else {
        const buf = fs.readFileSync(sourcePath)
        const { width, height } = getJpegSize(buf)
        const ins = await dbClient.query(
          `INSERT INTO media (filename, alt, url, width, height, filesize, mime_type, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()) RETURNING id`,
          [filename, `${sku} - ${filename}`, `${MEDIA_URL_BASE}/${filename}`,
           width, height, buf.length, 'image/jpeg']
        )
        mediaId = ins.rows[0].id
      }

      // 4. products_images にリンク
      const alreadyLinked = await dbClient.query(
        'SELECT id FROM products_images WHERE _parent_id=$1 AND image_id=$2',
        [productId, mediaId]
      )
      if (alreadyLinked.rows.length === 0) {
        currentOrder++
        await dbClient.query(
          'INSERT INTO products_images (id,_order,_parent_id,image_id) VALUES ($1,$2,$3,$4)',
          [generateId(), currentOrder, productId, mediaId]
        )
        totalLinked++
        console.log(`  OK ${filename} | media:${mediaId} | order:${currentOrder}${alreadyInR2?' (R2済み)':''}`)
      } else {
        console.log(`  SKIP ${filename}: リンク済み`)
      }

      masterImages.push({ filename, position: i + 2, alt: '', directory: hubDir })
      regAdditional.push(filename)
    } catch (err) {
      totalErrors++
      console.error(`  ERROR ${filename}: ${err.message?.slice(0, 100)}`)
    }
  }

  // マスターJSON更新用データを保存
  masterUpdates[sku] = { sourceDir, hubDir, masterImages, regAdditional, mainFile }
}

// ------------------------------------------------------------------
// Step 5: マスター JSON 更新
// ------------------------------------------------------------------
console.log('\n【マスターJSON 更新】')
for (const [sku, data] of Object.entries(masterUpdates)) {
  const jsonPath = path.join(HUB_MASTER, `${sku}.json`)
  if (!fs.existsSync(jsonPath)) continue

  let master
  try { master = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) } catch { continue }

  // 既存のimages（メイン）を保持しつつ追加分をマージ
  const existingMain = (master.images || []).filter(img => !img.filename.includes('__'))
  const newImages = existingMain.length > 0 ? existingMain : (data.masterImages.filter(i => !i.filename.includes('__')))
  const addImages = data.masterImages.filter(i => i.filename.includes('__'))

  // directory を hubDir に統一
  const mergedImages = [
    ...newImages.map((img, idx) => ({ ...img, position: idx + 1, directory: data.hubDir })),
    ...addImages.map((img, i) => ({ ...img, position: newImages.length + i + 1, directory: data.hubDir })),
  ]

  if (isDryRun) {
    console.log(`  [DRY] ${sku}: images ${master.images?.length || 0}枚 → ${mergedImages.length}枚`)
    continue
  }

  master.images = mergedImages
  if (master.metadata) master.metadata.updated_at = new Date().toISOString()
  fs.writeFileSync(jsonPath, JSON.stringify(master, null, 2), 'utf-8')
  console.log(`  OK ${sku}: images → ${mergedImages.length}枚`)
}

// ------------------------------------------------------------------
// Step 6: registry.json 更新
// ------------------------------------------------------------------
console.log('\n【registry.json 更新】')
let regUpdated = 0
for (const [sku, data] of Object.entries(masterUpdates)) {
  const existing = registry.products?.[sku] || {}
  const primary = data.mainFile?.filename || existing.primary || `${sku}.jpg`
  const newEntry = {
    directory: data.hubDir,
    primary,
    additional: data.regAdditional,
  }

  if (isDryRun) {
    console.log(`  [DRY] ${sku}: additional ${existing.additional?.length || 0}枚 → ${newEntry.additional.length}枚`)
    continue
  }

  if (!registry.products) registry.products = {}
  registry.products[sku] = newEntry
  regUpdated++
}

if (!isDryRun && regUpdated > 0) {
  registry.updated_at = new Date().toISOString()
  // base_path をhub内パスに追記（元のG:も残す）
  registry.hub_images_path = 'uballoon-product-hub/images'
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8')
  console.log(`  registry.json 更新: ${regUpdated}件`)
}

await dbClient.end()

// ------------------------------------------------------------------
// 完了
// ------------------------------------------------------------------
console.log('\n' + '='.repeat(60))
console.log('  完了')
console.log('='.repeat(60))
console.log(`  hub へコピー: ${totalCopied}枚`)
console.log(`  R2 アップロード: ${totalUploaded}枚`)
console.log(`  DB リンク: ${totalLinked}枚`)
console.log(`  エラー: ${totalErrors}枚`)
if (isDryRun) {
  console.log('\n  実行するには --execute を付けてください:')
  console.log('  node scripts/complete-missing-images.mjs --execute')
}
console.log('')
