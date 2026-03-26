/**
 * マスターデータ → Payload CMS インポートスクリプト
 *
 * Usage:
 *   npx tsx scripts/import-from-master.ts [--execute] [--verbose] [--limit N] [--offset N] [--no-images]
 *
 * Data sources:
 *   - Master JSON: D:/dev/uballoon/uballoon-product-hub/master/products/*.json
 *   - CSV (price/tag source of truth): D:/ダウンロード/バルーン商品管理202412 - export all (1).csv
 *   - Images: G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com/
 */

import fs from 'fs'
import path from 'path'

// ------------------------------------------------------------------
// 1. Load .env
// ------------------------------------------------------------------
const projectDir = path.resolve(import.meta.dirname ?? __dirname, '..')
const envPath = path.join(projectDir, '.env')
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

// ------------------------------------------------------------------
// 2. CLI args & config
// ------------------------------------------------------------------
const args = process.argv.slice(2)
const isExecute = args.includes('--execute')
const isDryRun = !isExecute
const isVerbose = args.includes('--verbose')
const noImages = args.includes('--no-images')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 0
const offsetIdx = args.indexOf('--offset')
const offset = offsetIdx !== -1 ? parseInt(args[offsetIdx + 1]) : 0

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL || 'admin@uballoon.com'
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD || 'admin123456'

const MASTER_DIR = 'D:/dev/uballoon/uballoon-product-hub/master/products'
const CSV_PATH = 'D:/ダウンロード/バルーン商品管理202412 - export all (1).csv'
const IMAGE_BASE = 'G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com'

// ------------------------------------------------------------------
// 3. CSV parser (price/tags source of truth)
// ------------------------------------------------------------------
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

type CSVProduct = {
  sku: string
  price: number
  title: string
  type: string
  tags: string[]
}

function parseCSV(): Map<string, CSVProduct> {
  let raw = fs.readFileSync(CSV_PATH, 'utf-8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)

  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  const map = new Map<string, CSVProduct>()

  // Skip header: 商品コード,販売価格,商品名,タイプ　,タグ,ヘリウム,...
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const sku = cols[0]?.trim()
    if (!sku) continue

    map.set(sku, {
      sku,
      price: parseInt(cols[1]) || 0,
      title: cols[2]?.trim() || '',
      type: cols[3]?.trim() || '',
      tags: (cols[4] || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }
  return map
}

// ------------------------------------------------------------------
// 4. Master data loader
// ------------------------------------------------------------------
type MasterProduct = {
  sku: string
  title: string
  description_html: string | null
  price: number
  category: string
  tags: string[]
  status: string
  images: {
    filename: string
    position: number
    alt: string
    directory: string
  }[]
  options: {
    name: string
    field_type: string
    required: boolean
    values: string[]
  }[]
  seo: { url_handle: string }
  platform_ids: { shopify_handle: string }
}

function loadMasterProducts(csvMap: Map<string, CSVProduct>): MasterProduct[] {
  const products: MasterProduct[] = []

  // Load only products that are in the CSV (source of truth for active products)
  for (const [sku] of csvMap) {
    const jsonPath = path.join(MASTER_DIR, `${sku}.json`)
    if (!fs.existsSync(jsonPath)) {
      console.warn(`  WARN: Master JSON not found for ${sku}`)
      continue
    }
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      const data = JSON.parse(raw)
      products.push(data)
    } catch (err: any) {
      console.warn(`  WARN: Failed to parse ${sku}.json: ${err.message?.slice(0, 80)}`)
    }
  }

  return products.sort((a, b) => a.sku.localeCompare(b.sku))
}

// ------------------------------------------------------------------
// 5. Image file finder
// ------------------------------------------------------------------
function findLocalImages(masterProduct: MasterProduct): string[] {
  const results: string[] = []
  for (const img of masterProduct.images || []) {
    const imgPath = path.join(IMAGE_BASE, img.directory, img.filename)
    if (fs.existsSync(imgPath)) {
      results.push(imgPath)
    }
  }
  return results
}

// ------------------------------------------------------------------
// 6. REST API client
// ------------------------------------------------------------------
let authToken = ''

async function apiLogin(): Promise<void> {
  console.log(`  Logging in as ${ADMIN_EMAIL}...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  authToken = data.token
  console.log(`  Login OK\n`)
}

async function apiFind(collection: string, field: string, value: string): Promise<any[]> {
  const params = new URLSearchParams()
  params.set(`where[${field}][equals]`, value)
  params.set('limit', '1')
  const res = await fetch(`${BASE_URL}/api/${collection}?${params}`, {
    headers: { Authorization: `JWT ${authToken}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.docs || []
}

async function apiCreate(collection: string, body: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${authToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Create ${collection} failed (${res.status}): ${text.slice(0, 300)}`)
  }
  return res.json()
}

async function uploadImage(filePath: string, altText: string): Promise<string> {
  const formData = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' })
  const fileName = path.basename(filePath)
  formData.append('file', blob, fileName)
  formData.append('_payload', JSON.stringify({ alt: altText || 'balloon image' }))

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${authToken}` },
    body: formData,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.doc?.id || data.id
}

// ------------------------------------------------------------------
// 7. Build Payload product data
// ------------------------------------------------------------------
function buildProductData(
  master: MasterProduct,
  csv: CSVProduct,
  imageIds: string[],
): Record<string, any> {
  // Use CSV price and tags as source of truth
  const price = csv.price
  const tags = csv.tags

  // Determine product type from CSV type or SKU prefix
  const productType = master.sku.startsWith('d-') ? 'delivery' : 'standard'

  // Build custom options from master data
  const selectOptions: any[] = []
  const textInputs: any[] = []

  for (const opt of master.options || []) {
    if (opt.field_type === 'select' || opt.field_type === 'radio') {
      selectOptions.push({
        name: opt.name,
        required: opt.required,
        choices: opt.values.map((v) => ({ label: v, additionalPrice: 0 })),
      })
    } else if (opt.field_type === 'textarea' || opt.field_type === 'text') {
      textInputs.push({
        name: opt.name,
        required: opt.required,
        placeholder: '',
        price: 0,
      })
    }
  }

  const slug = master.seo?.url_handle || master.platform_ids?.shopify_handle || master.sku

  return {
    title: csv.title || master.title,
    slug,
    sku: master.sku,
    price,
    productType,
    tags,
    shopifyHandle: master.platform_ids?.shopify_handle || slug,
    bodyHtml: master.description_html || undefined,
    images: imageIds.map((id) => ({ image: id })),
    customOptions: {
      selectOptions,
      textInputs,
    },
    status: 'published',
  }
}

// ------------------------------------------------------------------
// 8. Main import
// ------------------------------------------------------------------
type ImportResult = {
  total: number
  created: number
  skipped: number
  errors: { sku: string; error: string }[]
  imagesUploaded: number
}

async function importProducts(
  masterProducts: MasterProduct[],
  csvMap: Map<string, CSVProduct>,
  dryRun: boolean,
): Promise<ImportResult> {
  const result: ImportResult = {
    total: masterProducts.length,
    created: 0,
    skipped: 0,
    errors: [],
    imagesUploaded: 0,
  }

  if (dryRun) {
    console.log('\n=== DRY RUN MODE ===\n')
  } else {
    console.log('\n=== EXECUTE MODE ===\n')
    await apiLogin()
  }

  for (let i = 0; i < masterProducts.length; i++) {
    const master = masterProducts[i]
    const csv = csvMap.get(master.sku)
    if (!csv) continue

    const progress = `[${i + 1}/${masterProducts.length}]`

    if (dryRun) {
      const localImages = findLocalImages(master)
      if (isVerbose) {
        console.log(
          `  ${progress} ${master.sku} | ${csv.title.slice(0, 40)} | ¥${csv.price} | tags:${csv.tags.join(',')} | imgs:${localImages.length} | opts:${master.options?.length || 0}`,
        )
      }
      result.created++
      result.imagesUploaded += localImages.length
      continue
    }

    // --- Execute mode ---
    try {
      // Check for existing product by SKU
      const existing = await apiFind('products', 'sku', master.sku)
      if (existing.length > 0) {
        if (isVerbose) console.log(`  ${progress} SKIP ${master.sku} (exists)`)
        result.skipped++
        continue
      }

      // Upload images
      const imageIds: string[] = []
      if (!noImages) {
        const localImages = findLocalImages(master)
        for (const imgPath of localImages) {
          try {
            const altText = `${csv.title} - ${path.basename(imgPath)}`
            const mediaId = await uploadImage(imgPath, altText)
            imageIds.push(mediaId)
            result.imagesUploaded++
          } catch (err: any) {
            console.warn(`  ${progress} Image upload warning: ${err.message?.slice(0, 80)}`)
          }
        }
      }

      // Create product
      const productData = buildProductData(master, csv, imageIds)
      const created = await apiCreate('products', productData)
      const newId = created.doc?.id || created.id
      result.created++

      if (isVerbose) {
        console.log(
          `  ${progress} OK ${master.sku} → id:${newId} | imgs:${imageIds.length} | ¥${csv.price}`,
        )
      } else if (result.created % 20 === 0) {
        console.log(`  ... ${result.created}/${result.total} imported`)
      }

      // Small delay to avoid overwhelming the server
      if (i % 5 === 4) await new Promise((r) => setTimeout(r, 200))
    } catch (err: any) {
      const msg = err?.message?.slice(0, 200) || String(err)
      result.errors.push({ sku: master.sku, error: msg })
      console.error(`  ${progress} ERROR ${master.sku}: ${msg}`)
    }
  }

  return result
}

// ------------------------------------------------------------------
// 9. Report
// ------------------------------------------------------------------
function printReport(result: ImportResult, dryRun: boolean) {
  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '  IMPORT DRY-RUN REPORT' : '  IMPORT EXECUTION REPORT')
  console.log('='.repeat(60))
  console.log(`  Total products:    ${result.total}`)
  console.log(`  Created:           ${result.created}`)
  console.log(`  Skipped:           ${result.skipped}`)
  console.log(`  Errors:            ${result.errors.length}`)
  console.log(`  Images uploaded:   ${result.imagesUploaded}`)
  console.log('='.repeat(60))

  if (result.errors.length > 0) {
    console.log('\n  Errors:')
    for (const e of result.errors.slice(0, 20)) {
      console.log(`    ${e.sku}: ${e.error}`)
    }
    if (result.errors.length > 20) {
      console.log(`    ... and ${result.errors.length - 20} more errors`)
    }
  }
}

// ------------------------------------------------------------------
// 10. Run
// ------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60))
  console.log('  Master Data → Payload CMS Import')
  console.log('='.repeat(60))
  console.log(`  Mode:      ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`)
  console.log(`  Server:    ${BASE_URL}`)
  console.log(`  Images:    ${noImages ? 'SKIP' : 'UPLOAD'}`)
  console.log('')

  // Parse CSV (source of truth for prices and tags)
  console.log('  Parsing CSV...')
  const csvMap = parseCSV()
  console.log(`  CSV products: ${csvMap.size}`)

  // Load master data
  console.log('  Loading master data...')
  let products = loadMasterProducts(csvMap)
  console.log(`  Master products matched: ${products.length}`)

  // Apply offset/limit
  if (offset > 0) {
    products = products.slice(offset)
    console.log(`  After offset(${offset}): ${products.length}`)
  }
  if (limit > 0) {
    products = products.slice(0, limit)
    console.log(`  After limit(${limit}): ${products.length}`)
  }

  // Count image matches
  let imgMatched = 0
  let imgTotal = 0
  for (const p of products) {
    const local = findLocalImages(p)
    if (local.length > 0) imgMatched++
    imgTotal += local.length
  }
  console.log(`  Image matches: ${imgMatched}/${products.length} products (${imgTotal} files)`)

  // Preview
  console.log('\n  Preview (first 5):')
  for (const p of products.slice(0, 5)) {
    const csv = csvMap.get(p.sku)!
    const imgs = findLocalImages(p)
    console.log(
      `    ${p.sku} | ${csv.title.slice(0, 35)} | ¥${csv.price} | tags:${csv.tags.join(',')} | imgs:${imgs.length}`,
    )
  }
  console.log('')

  const result = await importProducts(products, csvMap, isDryRun)
  printReport(result, isDryRun)

  if (isDryRun) {
    console.log('\n  To import, run with --execute:')
    console.log(`    npx tsx scripts/import-from-master.ts --execute --verbose\n`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
