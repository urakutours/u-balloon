/**
 * upload-missing-images.mjs
 * 画像未登録の公開商品に対し、Googleドライブから画像をR2にアップロードし、
 * Payloadのmediaレコード + products_imagesレコードを作成する。
 *
 * Usage:
 *   node scripts/upload-missing-images.mjs [--dry-run]
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import pkg from 'pg'
const { Client } = pkg
import { readFileSync, existsSync } from 'fs'
import { createHash } from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

// Windows path helper
const toWinPath = (p) => p.replace(/\//g, '\\')

// --- 設定 ---
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wD8FQp3EhYvy@ep-rough-wave-a1dx7121-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const R2_BUCKET = process.env.R2_BUCKET || 'uballoon-media'
const R2_ENDPOINT = process.env.R2_ENDPOINT || 'https://c36cc68ef81c11b24b7ee8f7de1604db.r2.cloudflarestorage.com'
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '64a643bb083c76cd96599e8f84a8e81f'
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '463ba3eb4a3667715eabced569037a71963401cdfc3200ba0dbffa918f4bbcd5'
const CDN_BASE = process.env.NEXT_PUBLIC_CDN_URL || 'https://uballoon-edge.urakutours.workers.dev'
const GDRIVE_BASE = 'G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com'
const REGISTRY_PATH = 'D:/dev/uballoon/uballoon-product-hub/images/registry.json'

const DRY_RUN = process.argv.includes('--dry-run')

// --- 対象商品（DBから事前取得済み）---
const PRODUCTS = [
  { id: 1,   sku: 'd-rls-0001' },
  { id: 2,   sku: 'd-rls-0025' },
  { id: 3,   sku: 'd-rls-0026' },
  { id: 305, sku: 'g-opt-0004' },
  { id: 306, sku: 'g-opt-0006' },
  { id: 307, sku: 'g-opt-0007' },
  { id: 308, sku: 'g-opt-0008' },
  { id: 309, sku: 'g-opt-0009' },
  { id: 310, sku: 'g-opt-0011' },
  { id: 311, sku: 'g-opt-0013' },
  { id: 312, sku: 'g-opt-0015' },
  { id: 313, sku: 'g-prf-0001' },
  { id: 314, sku: 'g-prf-0002' },
  { id: 315, sku: 'g-prf-0003' },
  { id: 316, sku: 'g-prf-0005' },
  { id: 317, sku: 'g-prf-0006' },
  { id: 318, sku: 'g-prf-0007' },
  { id: 319, sku: 'g-prf-0011' },
  { id: 320, sku: 'g-prf-0012' },
  { id: 321, sku: 'g-prf-0013' },
  { id: 322, sku: 'g-prf-0014' },
  { id: 323, sku: 'g-prf-0015' },
  { id: 325, sku: 'g-prf-0017' },
  { id: 326, sku: 'g-prf-0019' },
  { id: 327, sku: 'g-prf-0020' },
  { id: 328, sku: 'g-pty-0001' },
  { id: 329, sku: 'g-pty-0002' },
  { id: 330, sku: 'g-pty-0003' },
]

// --- R2クライアント ---
const s3 = new S3Client({
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  region: 'auto',
  forcePathStyle: false,
})

async function getImageSize(filePath) {
  try {
    const { default: sharp } = await import('sharp')
    const meta = await sharp(filePath).metadata()
    return { width: meta.width || null, height: meta.height || null }
  } catch {
    return { width: null, height: null }
  }
}

async function fileExistsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function uploadToR2(key, buffer, mimeType) {
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }))
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN mode ===' : '=== LIVE mode ===')
  console.log()

  // Load registry
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'))

  // Connect to DB
  const db = new Client({ connectionString: DATABASE_URL })
  await db.connect()
  console.log('DB connected')

  let ok = 0, skipped = 0, errors = 0

  for (const product of PRODUCTS) {
    const { id: productId, sku } = product
    const info = registry.products[sku]
    if (!info) {
      console.warn(`  [SKIP] ${sku}: not in registry`)
      skipped++
      continue
    }

    const { directory, primary: filename } = info
    const localPath = `${GDRIVE_BASE}/${directory}/${filename}`
    const winPath = localPath.replace(/\//g, '\\')

    if (!existsSync(winPath)) {
      console.error(`  [ERROR] ${sku}: file not found: ${winPath}`)
      errors++
      continue
    }

    // Check if products_images already has a record for this product
    const existing = await db.query(
      'SELECT id FROM products_images WHERE _parent_id = $1 LIMIT 1',
      [productId]
    )
    if (existing.rows.length > 0) {
      console.log(`  [SKIP] ${sku} (id:${productId}): already has images`)
      skipped++
      continue
    }

    console.log(`  [PROC] ${sku} (id:${productId}): ${filename}`)

    if (DRY_RUN) {
      ok++
      continue
    }

    try {
      const buffer = readFileSync(winPath)
      const filesize = buffer.length
      const mimeType = 'image/jpeg'
      const r2Key = filename  // flat structure, same as filename

      // Upload to R2 (skip if already exists)
      const alreadyInR2 = await fileExistsInR2(r2Key)
      if (!alreadyInR2) {
        await uploadToR2(r2Key, buffer, mimeType)
        console.log(`    → uploaded to R2: ${r2Key}`)
      } else {
        console.log(`    → already in R2: ${r2Key}`)
      }

      // Get image dimensions
      const { width, height } = await getImageSize(winPath)

      const cdnUrl = `${CDN_BASE}/${filename}`
      const now = new Date().toISOString()

      // Check if media record already exists
      const mediaExisting = await db.query(
        "SELECT id FROM media WHERE filename = $1 LIMIT 1",
        [filename]
      )

      let mediaId
      if (mediaExisting.rows.length > 0) {
        mediaId = mediaExisting.rows[0].id
        console.log(`    → media record exists: id=${mediaId}`)
      } else {
        // Insert media record
        const mediaInsert = await db.query(
          `INSERT INTO media (alt, updated_at, created_at, url, filename, mime_type, filesize, width, height)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            sku,      // alt text = SKU (管理しやすいデフォルト値)
            now,
            now,
            cdnUrl,
            filename,
            mimeType,
            filesize,
            width,
            height,
          ]
        )
        mediaId = mediaInsert.rows[0].id
        console.log(`    → media record created: id=${mediaId}`)
      }

      // Insert products_images record
      const linkId = createHash('md5').update(`${productId}-${mediaId}`).digest('hex').substring(0, 24)
      await db.query(
        `INSERT INTO products_images (_order, _parent_id, id, image_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [1, productId, linkId, mediaId]
      )
      console.log(`    → products_images linked (product:${productId} → media:${mediaId})`)

      ok++
    } catch (err) {
      console.error(`  [ERROR] ${sku}: ${err.message}`)
      errors++
    }
  }

  await db.end()

  console.log()
  console.log(`=== 完了 ===`)
  console.log(`  成功: ${ok}件`)
  console.log(`  スキップ: ${skipped}件`)
  console.log(`  エラー: ${errors}件`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
