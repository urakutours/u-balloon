/**
 * 追加画像 R2アップロード + DB登録スクリプト
 *
 * Type B: 25商品の追加画像（__01, __02...）をR2にアップロードし、
 *         mediaテーブルに登録、products_imagesにリンクする
 *
 * Usage:
 *   node scripts/upload-extra-images.mjs             # dry-run
 *   node scripts/upload-extra-images.mjs --execute   # 実行
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '../node_modules/@aws-sdk/client-s3/dist-cjs/index.js'
import pg from '../node_modules/pg/lib/index.js'

// ------------------------------------------------------------------
// 設定
// ------------------------------------------------------------------
const MASTER_DIR = 'D:/dev/uballoon/uballoon-product-hub/master/products'
const IMAGE_BASE = 'G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com'
const ALL_DIRS = ['gift', 'delivery', 'option', 'party', 'prix fixe', '追加']

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

function generatePayloadId() {
  return crypto.randomBytes(12).toString('hex')
}

function findImage(filename) {
  for (const dir of ALL_DIRS) {
    const p = path.join(IMAGE_BASE, dir, filename)
    if (fs.existsSync(p)) return { dir, path: p }
  }
  return null
}

// 対象SKU（Type B: ローカルに追加画像がある25件）
const TARGET_SKUS = [
  'g-opt-0004','g-opt-0006','g-opt-0007','g-opt-0008','g-opt-0009','g-opt-0011',
  'g-opt-0013','g-opt-0015','g-prf-0001','g-prf-0002','g-prf-0003','g-prf-0005',
  'g-prf-0006','g-prf-0007','g-prf-0011','g-prf-0012','g-prf-0013','g-prf-0014',
  'g-prf-0015','g-prf-0016','g-prf-0017','g-prf-0019',
  'g-pty-0001','g-pty-0002','g-pty-0003'
]

console.log('='.repeat(60))
console.log('  追加画像 R2アップロード + DB登録')
console.log('='.repeat(60))
console.log(`  モード: ${isDryRun ? 'DRY RUN（確認のみ）' : 'EXECUTE（実行）'}`)
console.log('')

// ------------------------------------------------------------------
// DB & R2 クライアント
// ------------------------------------------------------------------
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
await client.connect()

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
const BUCKET = process.env.R2_BUCKET

// Cloudflare Workers の公開URL（既存mediaのURLパターンから）
const mediaUrlBase = 'https://uballoon-edge.urakutours.workers.dev'

// ------------------------------------------------------------------
// メイン処理
// ------------------------------------------------------------------
let totalUploaded = 0
let totalLinked = 0
let totalSkipped = 0
let totalErrors = 0

for (const sku of TARGET_SKUS) {
  let master
  try {
    master = JSON.parse(fs.readFileSync(`${MASTER_DIR}/${sku}.json`, 'utf-8'))
  } catch { continue }

  const images = master.images || []
  const extraImages = images.filter((_, idx) => idx > 0)
  if (extraImages.length === 0) continue

  // product id 取得
  const prod = await client.query('SELECT id FROM products WHERE sku = $1', [sku])
  const productId = prod.rows[0]?.id
  if (!productId) { console.log(`  SKIP ${sku}: product not found`); continue }

  // 現在の最大_order
  const orderRes = await client.query(
    'SELECT MAX(_order) as max_order FROM products_images WHERE _parent_id = $1',
    [productId]
  )
  let currentOrder = orderRes.rows[0]?.max_order || 0

  console.log(`\n${sku} (追加${extraImages.length}枚):`)

  for (const img of extraImages) {
    const localInfo = findImage(img.filename)
    if (!localInfo) {
      console.log(`  SKIP ${img.filename}: ローカルファイルなし`)
      totalSkipped++
      continue
    }

    if (isDryRun) {
      currentOrder++
      console.log(`  [DRY] ${img.filename} → R2:${img.filename} | order:${currentOrder}`)
      totalUploaded++
      totalLinked++
      continue
    }

    try {
      // 1. R2にすでにあるか確認
      let alreadyInR2 = false
      try {
        await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: img.filename }))
        alreadyInR2 = true
      } catch {}

      // 2. R2アップロード（未アップロードの場合）
      if (!alreadyInR2) {
        const fileBuffer = fs.readFileSync(localInfo.path)
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: img.filename,
          Body: fileBuffer,
          ContentType: 'image/jpeg',
        }))
        totalUploaded++
      }

      // 3. mediaテーブルに既存レコードがあるか確認
      const existingMedia = await client.query(
        'SELECT id FROM media WHERE filename = $1',
        [img.filename]
      )

      let mediaId
      if (existingMedia.rows.length > 0) {
        mediaId = existingMedia.rows[0].id
      } else {
        // mediaテーブルに新規登録
        const fileBuffer = fs.readFileSync(localInfo.path)
        const { width, height } = await getImageDimensions(localInfo.path)
        mediaId = await client.query(
          `INSERT INTO media (filename, alt, url, width, height, filesize, mime_type, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id`,
          [
            img.filename,
            `${sku} - ${img.filename}`,
            `${mediaUrlBase}/${img.filename}`,
            width || null,
            height || null,
            fileBuffer.length,
            'image/jpeg',
          ]
        )
        mediaId = mediaId.rows[0].id
      }

      // 4. products_imagesにリンク（未リンクの場合のみ）
      const alreadyLinked = await client.query(
        'SELECT id FROM products_images WHERE _parent_id = $1 AND image_id = $2',
        [productId, mediaId]
      )
      if (alreadyLinked.rows.length === 0) {
        currentOrder++
        const piId = generatePayloadId()
        await client.query(
          'INSERT INTO products_images (id, _order, _parent_id, image_id) VALUES ($1, $2, $3, $4)',
          [piId, currentOrder, productId, mediaId]
        )
        totalLinked++
        console.log(`  OK ${img.filename} | media:${mediaId} | order:${currentOrder}${alreadyInR2 ? ' (R2済み)' : ''}`)
      } else {
        totalSkipped++
        console.log(`  SKIP ${img.filename}: すでにリンク済み`)
      }
    } catch (err) {
      totalErrors++
      console.error(`  ERROR ${img.filename}: ${err.message?.slice(0, 120)}`)
    }
  }
}

// ------------------------------------------------------------------
// 画像寸法取得（簡易）
// ------------------------------------------------------------------
async function getImageDimensions(filePath) {
  // JPEGのSOF0マーカーから読み取り
  try {
    const buf = fs.readFileSync(filePath)
    for (let i = 0; i < buf.length - 12; i++) {
      if (buf[i] === 0xFF && (buf[i+1] === 0xC0 || buf[i+1] === 0xC2)) {
        const height = (buf[i+5] << 8) | buf[i+6]
        const width = (buf[i+7] << 8) | buf[i+8]
        return { width, height }
      }
    }
  } catch {}
  return { width: null, height: null }
}

await client.end()

console.log('\n' + '='.repeat(60))
console.log('  完了')
console.log('='.repeat(60))
console.log(`  R2アップロード: ${totalUploaded}枚`)
console.log(`  DBリンク: ${totalLinked}枚`)
console.log(`  スキップ: ${totalSkipped}枚`)
console.log(`  エラー: ${totalErrors}枚`)
if (isDryRun) {
  console.log('\n  実行するには --execute オプションを付けてください:')
  console.log('  node scripts/upload-extra-images.mjs --execute')
}
console.log('')
