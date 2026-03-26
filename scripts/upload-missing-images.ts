/**
 * Upload missing product images to Payload CMS
 * Uses REST API with admin authentication (same as import-shopify-products.ts)
 *
 * Usage: npx tsx scripts/upload-missing-images.ts [--execute]
 */
import fs from 'fs'
import path from 'path'

// Load .env
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

const isExecute = process.argv.includes('--execute')
const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000'
const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL || 'admin@uballoon.com'
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD || 'admin123456'
const IMAGE_BASE = 'G:/マイドライブ/仕事/U BALLOON/ネットショップ/商品画像　最新/BD.com'

// SKU prefix → subfolder mapping
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
  'g-60t': 'gift',
  'g-mat': 'option',
  'g-opt': 'option',
  'g-prf': 'prix fixe',
  'g-pty': 'party',
}

function getSkuPrefix(sku: string): string {
  const m = sku.match(/^([a-z]-[a-z0-9]+)/)
  return m ? m[1] : ''
}

function getImageFolder(sku: string): string | null {
  const prefix = getSkuPrefix(sku)
  return IMAGE_FOLDERS[prefix] || null
}

let authToken = ''

async function apiLogin(): Promise<void> {
  console.log(`Logging in as ${ADMIN_EMAIL}...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status}`)
  const data = await res.json()
  authToken = data.token
  console.log('Login OK\n')
}

async function uploadImage(filePath: string, altText: string): Promise<number> {
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
  return data.doc.id
}

async function main() {
  if (!isExecute) {
    console.log('=== DRY-RUN MODE (add --execute to actually upload) ===\n')
  }

  await apiLogin()

  // Get all products (using our custom API that handles pagination)
  console.log('Fetching products...')
  const missingProducts: { id: number; sku: string; title: string }[] = []

  for (let page = 1; page <= 30; page++) {
    const res = await fetch(`${BASE_URL}/api/products?page=${page}`)
    const data = await res.json()
    if (!data.products || data.products.length === 0) break

    for (const p of data.products) {
      if (!p.imageUrl && p.sku) {
        missingProducts.push({ id: parseInt(p.id), sku: p.sku, title: p.title })
      }
    }
    if (!data.hasNextPage) break
  }

  console.log(`Found ${missingProducts.length} products missing images\n`)

  for (const product of missingProducts) {
    const { id, sku, title } = product
    const folder = getImageFolder(sku)
    if (!folder) {
      console.log(`⚠ Unknown SKU prefix for ${sku}`)
      continue
    }

    const imageDir = path.join(IMAGE_BASE, folder)
    const mainImage = path.join(imageDir, `${sku}.jpg`)

    if (!fs.existsSync(mainImage)) {
      console.log(`⚠ Image not found: ${mainImage}`)
      continue
    }

    // Find all related images
    const allFiles = fs.readdirSync(imageDir)
      .filter((f) => f.startsWith(sku) && f.endsWith('.jpg'))
      .sort()

    console.log(`${sku} - ${title.substring(0, 50)}`)
    console.log(`  ${allFiles.length} images found`)

    if (!isExecute) {
      console.log(`  [DRY-RUN] Would upload ${allFiles.length} images`)
      continue
    }

    // Upload each image
    const imageRefs: { image: number }[] = []
    for (const file of allFiles) {
      const filePath = path.join(imageDir, file)
      try {
        const mediaId = await uploadImage(filePath, `${title} - ${file}`)
        imageRefs.push({ image: mediaId })
        console.log(`  ✓ ${file} → ${mediaId}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`  ✗ ${file}: ${msg}`)
      }
    }

    if (imageRefs.length === 0) continue

    // Update product
    try {
      const res = await fetch(`${BASE_URL}/api/products/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${authToken}`,
        },
        body: JSON.stringify({ images: imageRefs }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.log(`  ✗ Update failed: ${text.slice(0, 100)}`)
      } else {
        console.log(`  ✓ Product updated with ${imageRefs.length} images`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`  ✗ Update error: ${msg}`)
    }
  }

  console.log('\nDone!')
}

main().catch(console.error)
