/**
 * Shopify JSON → Payload CMS タグ＆商品説明更新スクリプト
 *
 * Usage:
 *   npx tsx scripts/update-tags-and-descriptions.ts              # dry-run
 *   npx tsx scripts/update-tags-and-descriptions.ts --execute    # 実行
 *
 * Data sources:
 *   - Tags:         D:/dev/uballoon/uballoon-tokyo-shopify/docs/all-products.json
 *   - Descriptions: D:/dev/uballoon/uballoon-tokyo-shopify/docs/product-descriptions.json
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

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL || 'admin@uballoon.com'
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD || 'admin123456'

const ALL_PRODUCTS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/docs/all-products.json'
const DESCRIPTIONS_PATH = 'D:/dev/uballoon/uballoon-tokyo-shopify/docs/product-descriptions.json'

// ------------------------------------------------------------------
// 3. Load JSON data
// ------------------------------------------------------------------
type ShopifyProduct = {
  id: number
  title: string
  handle: string
  tags: string
  variants: { sku: string }[]
}

type DescriptionProduct = {
  id: number
  title: string
  sku: string
  tags: string
  body_html: string
}

const allProducts: ShopifyProduct[] = JSON.parse(fs.readFileSync(ALL_PRODUCTS_PATH, 'utf-8'))
const descriptions: DescriptionProduct[] = JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, 'utf-8'))

// Build lookup maps by SKU (handle) and also by variant SKU
const tagsBySku = new Map<string, string[]>()
const tagsByHandle = new Map<string, string[]>()
for (const p of allProducts) {
  const tags = p.tags ? p.tags.split(', ').map(t => t.trim()).filter(Boolean) : []
  tagsByHandle.set(p.handle, tags)
  if (p.variants?.[0]?.sku) {
    tagsBySku.set(p.variants[0].sku, tags)
  }
}

const descBySku = new Map<string, string>()
for (const d of descriptions) {
  if (d.sku && d.body_html) {
    descBySku.set(d.sku, d.body_html)
  }
}

console.log(`📦 Loaded ${allProducts.length} products from all-products.json`)
console.log(`📝 Loaded ${descriptions.length} descriptions from product-descriptions.json`)
console.log(`🏷️  Tags map: ${tagsBySku.size} by SKU, ${tagsByHandle.size} by handle`)
console.log(`📄 Descriptions map: ${descBySku.size} entries`)
console.log(isDryRun ? '\n🔍 DRY-RUN MODE (use --execute to apply)\n' : '\n🚀 EXECUTE MODE\n')

// ------------------------------------------------------------------
// 4. Auth & API helpers
// ------------------------------------------------------------------
async function login(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  return data.token
}

async function fetchAllPayloadProducts(token: string) {
  const products: any[] = []
  let page = 1
  let hasMore = true
  while (hasMore) {
    const res = await fetch(`${BASE_URL}/api/products?limit=100&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    })
    if (!res.ok) throw new Error(`Fetch products failed: ${res.status}`)
    const data = await res.json()
    products.push(...data.docs)
    hasMore = data.hasNextPage
    page++
  }
  return products
}

async function updateProduct(token: string, id: string, updates: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Update ${id} failed: ${res.status} ${text}`)
  }
  return res.json()
}

// ------------------------------------------------------------------
// 5. Main
// ------------------------------------------------------------------
async function main() {
  const token = await login()
  console.log('✅ Logged in\n')

  const payloadProducts = await fetchAllPayloadProducts(token)
  console.log(`📋 Found ${payloadProducts.length} products in Payload DB\n`)

  let tagsUpdated = 0
  let descUpdated = 0
  let skipped = 0
  let notFound = 0

  for (const pp of payloadProducts) {
    const sku = pp.sku || ''
    const handle = pp.shopifyHandle || pp.slug || ''

    // Find matching tags from Shopify
    const newTags = tagsBySku.get(sku) || tagsByHandle.get(handle)
    // Find matching description
    const newDesc = descBySku.get(sku)

    if (!newTags && !newDesc) {
      notFound++
      continue
    }

    const currentTags: string[] = Array.isArray(pp.tags) ? pp.tags : []
    const currentDesc: string = pp.bodyHtml || ''

    const tagsChanged = newTags && JSON.stringify(currentTags.sort()) !== JSON.stringify([...newTags].sort())
    const descChanged = newDesc && newDesc !== currentDesc

    if (!tagsChanged && !descChanged) {
      skipped++
      continue
    }

    const updates: Record<string, unknown> = {}
    if (tagsChanged && newTags) {
      updates.tags = newTags
    }
    if (descChanged && newDesc) {
      updates.bodyHtml = newDesc
    }

    if (isDryRun) {
      console.log(`[DRY] ${sku} "${pp.title}"`)
      if (tagsChanged) {
        console.log(`  tags: [${currentTags.join(', ')}] → [${newTags!.join(', ')}]`)
        tagsUpdated++
      }
      if (descChanged) {
        console.log(`  desc: ${currentDesc ? '(existing)' : '(empty)'} → (${newDesc!.length} chars)`)
        descUpdated++
      }
    } else {
      try {
        await updateProduct(token, pp.id, updates)
        if (tagsChanged) tagsUpdated++
        if (descChanged) descUpdated++
        console.log(`✅ ${sku} "${pp.title}"`)
      } catch (e: any) {
        console.error(`❌ ${sku}: ${e.message}`)
      }
    }
  }

  console.log('\n--- Summary ---')
  console.log(`Tags updated:  ${tagsUpdated}`)
  console.log(`Desc updated:  ${descUpdated}`)
  console.log(`Skipped (no change): ${skipped}`)
  console.log(`Not found in Shopify data: ${notFound}`)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
