/**
 * orders テーブルに event_name カラムを追加する一度きりのマイグレーションスクリプト。
 * Payload v3 + @payloadcms/db-postgres の命名規則に従う: camelCase → snake_case
 *
 * 実行:
 *   node scripts/db-add-order-event-name.mjs --dry-run  # 発行予定SQLを表示
 *   node scripts/db-add-order-event-name.mjs            # 本番適用
 *
 * 既存: db-add-shipping-plans.mjs 同様のパターン
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
  // orders テーブルに event_name カラムを追加
  // Payload v3 は eventName (text) を event_name varchar にマッピングする
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_name varchar`,
]

try {
  console.log(`\n=== Add event_name column to orders ===`)
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
    const cols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'orders'
        AND column_name = 'event_name'
    `)
    if (cols.rows.length > 0) {
      console.log('\nVerification:')
      console.log('  orders.event_name:', cols.rows[0].data_type)
    } else {
      console.error('\n  ERROR: event_name column not found after migration')
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
