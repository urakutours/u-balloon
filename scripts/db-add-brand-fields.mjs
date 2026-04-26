/**
 * SiteSettings に brand 関連 3 列を追加する idempotent スクリプト。
 * Payload v3 で `type: 'text'` フィールドは varchar 列に対応する。
 * 列がないと SiteSettings global の query が失敗し、admin で
 * 「Nothing found」になる + 全ての email-templates / Header /
 * 件名 prefix が SiteSettings 経由解決を諦めて FALLBACK_BRAND
 * 値にフォールバックする。
 *
 * 追加列:
 *   brand_name              varchar  -- ブランド名 (例: 'u-balloon')
 *   brand_tagline           varchar  -- Header SEO 用キャッチコピー
 *   email_subject_prefix    varchar  -- 全送信メール件名の冒頭 (例: '【u-balloon】')
 *
 * 使い方:
 *   node scripts/db-add-brand-fields.mjs --dry-run  # 確認
 *   node scripts/db-add-brand-fields.mjs            # 実行
 *
 * 実行タイミング: PR をマージする「前」に本番 DB に対して実行すること。
 *                 列を先に追加 → コードデプロイ → 安全 (db-add-footer-copyright-text.mjs
 *                 と同じ運用パターン)。
 *                 preview DB に対しても別途実行すれば preview 検証も通せる。
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
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS brand_name varchar`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS brand_tagline varchar`,
  `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS email_subject_prefix varchar`,
]

try {
  console.log(`\n=== Add brand_name / brand_tagline / email_subject_prefix to site_settings ===`)
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
        AND column_name IN ('brand_name', 'brand_tagline', 'email_subject_prefix')
      ORDER BY column_name
    `)
    if (res.rows.length !== 3) {
      console.log(`\n⚠️  Verification: 期待 3 列、実際 ${res.rows.length} 列 — 不足あり`)
      process.exit(1)
    }
    console.log(
      '\n✓ Verification:',
      res.rows.map((r) => `${r.column_name} (${r.data_type})`).join(', '),
    )
  }
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
