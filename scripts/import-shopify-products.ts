/**
 * Shopify商品データ → Payload CMS インポートスクリプト
 *
 * Usage:
 *   npx tsx scripts/import-shopify-products.ts [--execute] [--verbose] [--limit N] [--offset N]
 *
 * Data sources:
 *   - Shopify CSV: G:/マイドライブ/プロジェクト/UBALLOON/商品DB/EC用/shopify_complete_20251013.csv
 *   - Options JSON: G:/マイドライブ/プロジェクト/UBALLOON/商品DB/EC用/product_options_detail.json
 *   - Images: G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com/
 *
 * Options:
 *   (default)     Dry-run mode
 *   --execute     Actually write to DB + upload images
 *   --verbose     Show detailed logs
 *   --limit N     Import only first N products
 *   --offset N    Skip first N products
 *   --no-images   Skip image upload (faster for testing)
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
// 2. CLI args
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

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3020'
const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL || 'admin@uballoon.com'
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD || 'admin123456'

const CSV_PATH = 'G:/マイドライブ/プロジェクト/UBALLOON/商品DB/EC用/shopify_complete_20251013.csv'
const OPTIONS_JSON_PATH = 'G:/マイドライブ/プロジェクト/UBALLOON/商品DB/EC用/product_options_detail.json'
const IMAGE_BASE = 'G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com'

// Image folder mapping: SKU prefix → subfolder
const IMAGE_FOLDERS: Record<string, string> = {
  'd-rls': 'delivery',
  'g-1st': 'gift',
  'g-btd': 'gift',
  'g-wed': 'gift',
  'g-bby': 'gift',
  'g-alm': 'gift',
  'g-mtr': 'gift',
  'g-rec': 'gift',
  'g-xms': 'gift',
  'g-gwl': 'gift',
  'g-mat': 'option',
  'g-opt': 'option',
  'g-prf': 'prix fixe',
  'g-pty': 'party',
}

function getSkuPrefix(sku: string): string {
  // Match patterns like "g-1st", "g-btd", "d-rls", "g-opt"
  const m = sku.match(/^([a-z]-[a-z0-9]+)/)
  return m ? m[1] : ''
}

// ------------------------------------------------------------------
// 3. CSV parser
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

type ShopifyProduct = {
  handle: string
  title: string
  bodyHtml: string
  tags: string[]
  price: number
  status: string
  images: string[] // CDN URLs
  sku: string
}

function parseShopifyCSV(): ShopifyProduct[] {
  let raw = fs.readFileSync(CSV_PATH, 'utf-8')
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)

  const lines = raw.split(/\r?\n/).filter((l) => l.trim())
  const header = parseCSVLine(lines[0])
  const idx = (name: string) => header.indexOf(name)

  const products: ShopifyProduct[] = []
  let current: ShopifyProduct | null = null

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const title = cols[idx('Title')]?.trim()
    const handle = cols[idx('Handle')]?.trim()

    if (title) {
      // New product row
      current = {
        handle,
        title,
        bodyHtml: cols[idx('Body (HTML)')]?.trim() || '',
        tags: (cols[idx('Tags')] || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        price: parseInt(cols[idx('Variant Price')]) || 0,
        status: cols[idx('Status')]?.trim() || 'active',
        images: [],
        sku: cols[idx('Variant SKU')]?.trim() || handle,
      }
      products.push(current)
    }

    // Collect images for current product
    const imgSrc = cols[idx('Image Src')]?.trim()
    if (current && imgSrc) {
      current.images.push(imgSrc)
    }
  }

  return products
}

// ------------------------------------------------------------------
// 4. Options JSON loader
// ------------------------------------------------------------------
type ShopifyOption = {
  sku: string
  product_name: string
  select_options: {
    name: string
    type: string
    required: boolean
    values: string[]
    count: number
  }[]
  text_inputs: {
    name: string
    type: string
    required: boolean
  }[]
}

function loadOptionsJSON(): Map<string, ShopifyOption> {
  if (!fs.existsSync(OPTIONS_JSON_PATH)) {
    console.warn('  Options JSON not found, skipping custom options')
    return new Map()
  }
  const data: ShopifyOption[] = JSON.parse(fs.readFileSync(OPTIONS_JSON_PATH, 'utf-8'))
  const map = new Map<string, ShopifyOption>()
  for (const opt of data) {
    map.set(opt.sku, opt)
  }
  return map
}

// ------------------------------------------------------------------
// 5. Image file finder
// ------------------------------------------------------------------
function findLocalImages(sku: string): string[] {
  const prefix = getSkuPrefix(sku)
  const folder = IMAGE_FOLDERS[prefix]
  if (!folder) return []

  const dirPath = path.join(IMAGE_BASE, folder)
  if (!fs.existsSync(dirPath)) return []

  const files = fs.readdirSync(dirPath)
  // Main image: exact SKU.jpg, then variants: SKU__01.jpg, SKU__02.jpg, etc.
  const main = files.filter((f) => f.toLowerCase() === `${sku}.jpg`)
  const variants = files
    .filter((f) => {
      const lower = f.toLowerCase()
      return lower.startsWith(`${sku}__`) && lower.endsWith('.jpg')
    })
    .sort()

  return [...main, ...variants].map((f) => path.join(dirPath, f))
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
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
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
    throw new Error(`Create ${collection} failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function uploadImage(filePath: string, altText: string): Promise<string> {
  const formData = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer], { type: 'image/jpeg' })
  const fileName = path.basename(filePath)
  formData.append('file', blob, fileName)
  // Payload REST API requires _payload JSON for additional fields
  formData.append('_payload', JSON.stringify({ alt: altText || 'balloon image' }))

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: {
      Authorization: `JWT ${authToken}`,
    },
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
// 7. Main import
// ------------------------------------------------------------------
type ImportResult = {
  total: number
  created: number
  skipped: number
  errors: { sku: string; error: string }[]
  imagesUploaded: number
}

async function importProducts(
  products: ShopifyProduct[],
  optionsMap: Map<string, ShopifyOption>,
  dryRun: boolean,
): Promise<ImportResult> {
  const result: ImportResult = {
    total: products.length,
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

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const progress = `[${i + 1}/${products.length}]`

    if (dryRun) {
      const localImages = findLocalImages(p.sku)
      const opts = optionsMap.get(p.sku)
      if (isVerbose) {
        console.log(
          `  ${progress} ${p.sku} | ${p.title.slice(0, 40)}... | ¥${p.price} | tags:${p.tags.join(',')} | localImg:${localImages.length} | opts:${opts ? 'yes' : 'no'}`,
        )
      }
      result.created++
      result.imagesUploaded += localImages.length
      continue
    }

    // --- Execute mode ---
    try {
      // Check for existing product by SKU
      const existing = await apiFind('products', 'sku', p.sku)
      if (existing.length > 0) {
        if (isVerbose) console.log(`  ${progress} SKIP ${p.sku} (exists)`)
        result.skipped++
        continue
      }

      // Upload images
      const imageIds: string[] = []
      if (!noImages) {
        const localImages = findLocalImages(p.sku)
        for (const imgPath of localImages) {
          try {
            const mediaId = await uploadImage(imgPath, `${p.title} - ${path.basename(imgPath)}`)
            imageIds.push(mediaId)
            result.imagesUploaded++
          } catch (err: any) {
            console.warn(`  ${progress} Image upload warning: ${err.message?.slice(0, 80)}`)
          }
        }
      }

      // Build custom options from JSON
      const opts = optionsMap.get(p.sku)
      const customOptions: any = {
        selectOptions: [],
        textInputs: [],
      }
      if (opts) {
        customOptions.selectOptions = opts.select_options.map((so) => ({
          name: so.name,
          required: so.required,
          choices: so.values.map((v) => ({ label: v, additionalPrice: 0 })),
        }))
        customOptions.textInputs = opts.text_inputs.map((ti) => ({
          name: ti.name,
          required: ti.required,
          placeholder: '',
          price: 0,
        }))
      }

      // Determine product type
      const productType = p.sku.startsWith('d-') ? 'delivery' : 'standard'

      // Create product
      const productData = {
        title: p.title,
        slug: p.handle,
        sku: p.sku,
        price: p.price,
        productType,
        tags: p.tags,
        shopifyHandle: p.handle,
        bodyHtml: p.bodyHtml || undefined,
        images: imageIds.map((id) => ({ image: id })),
        customOptions,
        status: 'published',
      }

      const created = await apiCreate('products', productData)
      const newId = created.doc?.id || created.id
      result.created++

      if (isVerbose) {
        console.log(
          `  ${progress} OK ${p.sku} → id:${newId} | imgs:${imageIds.length} | opts:${opts ? 'yes' : 'no'}`,
        )
      } else if (result.created % 20 === 0) {
        console.log(`  ... ${result.created}/${result.total} imported`)
      }

      // Small delay to avoid overwhelming the server
      if (i % 5 === 4) await new Promise((r) => setTimeout(r, 200))
    } catch (err: any) {
      const msg = err?.message?.slice(0, 150) || String(err)
      result.errors.push({ sku: p.sku, error: msg })
      console.error(`  ${progress} ERROR ${p.sku}: ${msg}`)
    }
  }

  return result
}

// ------------------------------------------------------------------
// 8. Report
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
// 9. Run
// ------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60))
  console.log('  Shopify → Payload Product Import')
  console.log('='.repeat(60))
  console.log(`  Mode:      ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`)
  console.log(`  Server:    ${BASE_URL}`)
  console.log(`  Images:    ${noImages ? 'SKIP' : 'UPLOAD'}`)
  console.log('')

  // Parse CSV
  console.log('  Parsing Shopify CSV...')
  let products = parseShopifyCSV()
  console.log(`  Found ${products.length} products`)

  // Filter active only
  products = products.filter((p) => p.status === 'active')
  console.log(`  Active products: ${products.length}`)

  // Apply offset/limit
  if (offset > 0) {
    products = products.slice(offset)
    console.log(`  After offset(${offset}): ${products.length}`)
  }
  if (limit > 0) {
    products = products.slice(0, limit)
    console.log(`  After limit(${limit}): ${products.length}`)
  }

  // Load options
  console.log('  Loading options JSON...')
  const optionsMap = loadOptionsJSON()
  console.log(`  Options for ${optionsMap.size} products`)

  // Count image matches
  let imgMatched = 0
  let imgTotal = 0
  for (const p of products) {
    const local = findLocalImages(p.sku)
    if (local.length > 0) imgMatched++
    imgTotal += local.length
  }
  console.log(`  Image matches: ${imgMatched}/${products.length} products (${imgTotal} files)`)

  // Preview
  console.log('\n  Preview (first 5):')
  for (const p of products.slice(0, 5)) {
    const imgs = findLocalImages(p.sku)
    const opts = optionsMap.get(p.sku)
    console.log(`    ${p.sku} | ${p.title.slice(0, 35)}... | ¥${p.price} | imgs:${imgs.length} | opts:${opts ? `${opts.select_options.length}sel+${opts.text_inputs.length}txt` : 'none'}`)
  }
  console.log('')

  const result = await importProducts(products, optionsMap, isDryRun)
  printReport(result, isDryRun)

  if (isDryRun) {
    console.log('\n  To import, run with --execute:')
    console.log(`    npx tsx scripts/import-shopify-products.ts --execute\n`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
