/**
 * SiteSettings に footerCopyrightText 列を追加する idempotent スクリプト。
 * Payload v3 で `type: 'text'` フィールドは varchar 列に対応する。
 * 列がないと getSiteSettings() が例外を投げ、Footer 等が空表示にフォールバック。
 *
 * 使い方:
 *   node scripts/db-add-footer-copyright-text.mjs --dry-run  # 確認
 *   node scripts/db-add-footer-copyright-text.mjs            # 実行
 *
 * 実行タイミング: PR をマージする「前」に本番 DB に対して実行すること。
 *                 列を先に追加 → コードデプロイ → 安全。
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
  // footerCopyrightText (type: 'text', single line) → varchar
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_copyright_text varchar`,
]

try {
  console.log(`\n=== Add footerCopyrightText to site_settings ===`)
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
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'site_settings'
        AND column_name = 'footer_copyright_text'
    `)
    if (res.rows.length === 0) {
      console.log('\n⚠️  Verification: 列が見つかりません')
      process.exit(1)
    }
    console.log('\n✓ Verification:', res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '))
  }
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
