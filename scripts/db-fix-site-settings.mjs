/**
 * SiteSettings の設定ファイルにあるが DB に未作成の列を追加する一度きりスクリプト。
 * Payload は未作成列があると GET で 500 を返すので、列をそろえて修復する。
 */
import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const DRY_RUN = process.argv.includes('--dry-run')

const stmts = [
  // siteOgImageUrl (type: text) → varchar
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS site_og_image_url varchar`,
  // shippingRestrictedAreas (type: text) → varchar
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS shipping_restricted_areas varchar`,
  // paymentMethodsText (type: textarea) → text (複数行)
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS payment_methods_text text`,
]

try {
  console.log(`\n=== Add missing site_settings columns ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  for (const sql of stmts) {
    console.log('  ' + (DRY_RUN ? '[DRY] ' : 'RUN: ') + sql)
    if (!DRY_RUN) {
      await pool.query(sql)
      console.log('       ✓ OK')
    }
  }

  if (!DRY_RUN) {
    const res = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'site_settings'
        AND column_name IN ('site_og_image_url', 'shipping_restricted_areas', 'payment_methods_text')
    `)
    console.log('\nVerification: ' + res.rows.map(r => r.column_name).join(', '))
  }
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
