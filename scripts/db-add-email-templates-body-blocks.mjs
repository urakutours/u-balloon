/**
 * email_templates_body_blocks テーブルを作成する一度きりのマイグレーション。
 * Payload v3 + @payloadcms/db-postgres の array フィールド命名規則に従う。
 *
 * 実行:
 *   node scripts/db-add-email-templates-body-blocks.mjs --dry-run  # 発行予定SQLを表示
 *   node scripts/db-add-email-templates-body-blocks.mjs            # 本番適用
 *
 * ※ Payload が起動時に自動でテーブルを作成する環境では不要。
 *   テーブルが既に存在する場合は IF NOT EXISTS により冪等に動作する。
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
  // bodyBlocks 配列テーブル
  // _parent_id は email_templates テーブルの id を参照
  `CREATE TABLE IF NOT EXISTS email_templates_body_blocks (
  id serial PRIMARY KEY,
  _order integer NOT NULL,
  _parent_id integer NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  block_key varchar NOT NULL,
  content text NOT NULL
)`,

  `CREATE INDEX IF NOT EXISTS email_templates_body_blocks_order_idx
  ON email_templates_body_blocks (_order)`,

  `CREATE INDEX IF NOT EXISTS email_templates_body_blocks_parent_id_idx
  ON email_templates_body_blocks (_parent_id)`,
]

try {
  console.log(`\n=== Add email_templates_body_blocks table ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  for (const sql of stmts) {
    const preview = sql.replace(/\s+/g, ' ').trim().slice(0, 120)
    if (DRY_RUN) {
      console.log('  [DRY] ' + preview + '...')
    } else {
      console.log('  RUN: ' + preview + '...')
      await pool.query(sql)
      console.log('       OK')
    }
  }

  if (!DRY_RUN) {
    const r = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'email_templates_body_blocks'
    `)
    if (r.rows.length > 0) {
      console.log('\nVerification: email_templates_body_blocks table exists.')
    } else {
      console.error('\nVerification FAILED: table not found after creation.')
      process.exit(1)
    }
  }

  console.log('\n=== Done ===\n')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
