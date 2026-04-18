/**
 * SiteSettings の checkout 再設計で追加された array/nested-array フィールド用の
 * DB テーブルを作成する一度きりのマイグレーションスクリプト。
 *
 * 対象テーブル（すべて本番で relation does not exist と報告されていた）:
 *   - site_settings_shipping_plans_available_time_slots
 *   - site_settings_gift_settings_message_card_templates
 *   - site_settings_gift_settings_wrapping_options
 *
 * スキーマは Payload v3 (@payloadcms/drizzle) の setColumnID + traverseFields ロジックに
 * 基づき、user-defined `id` text フィールドがあると varchar PK になる規則に従う。
 *
 * 実行:
 *   node scripts/db-add-time-slots.mjs --dry-run  # 発行予定SQLを表示
 *   node scripts/db-add-time-slots.mjs            # 本番適用
 *
 * 既存: db-add-shipping-plans.mjs と同じパターン
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
  // nested array table: site_settings_shipping_plans_available_time_slots
  // 親は site_settings_shipping_plans (id: serial integer)
  // user-defined `id` text field → PK varchar
  `CREATE TABLE IF NOT EXISTS site_settings_shipping_plans_available_time_slots (
  id varchar PRIMARY KEY,
  _order integer NOT NULL,
  _parent_id integer NOT NULL REFERENCES site_settings_shipping_plans(id) ON DELETE CASCADE,
  label varchar,
  value varchar,
  active boolean DEFAULT true,
  sort_order numeric DEFAULT 0
)`,

  `CREATE INDEX IF NOT EXISTS site_settings_shipping_plans_available_time_slots_order_idx
  ON site_settings_shipping_plans_available_time_slots (_order)`,

  `CREATE INDEX IF NOT EXISTS site_settings_shipping_plans_available_time_slots_parent_id_idx
  ON site_settings_shipping_plans_available_time_slots (_parent_id)`,

  // ─── gift_settings_message_card_templates (top-level array under collapsible) ───
  // user-defined `id` text → varchar PK
  // fields: id(text), label(text), sort_order(numeric), body(text), active(boolean)
  `CREATE TABLE IF NOT EXISTS site_settings_gift_settings_message_card_templates (
  id varchar PRIMARY KEY,
  _order integer NOT NULL,
  _parent_id integer NOT NULL REFERENCES site_settings(id) ON DELETE CASCADE,
  label varchar,
  sort_order numeric DEFAULT 0,
  body text,
  active boolean DEFAULT true
)`,

  `CREATE INDEX IF NOT EXISTS site_settings_gift_settings_message_card_templates_order_idx
  ON site_settings_gift_settings_message_card_templates (_order)`,

  `CREATE INDEX IF NOT EXISTS site_settings_gift_settings_message_card_templates_parent_id_idx
  ON site_settings_gift_settings_message_card_templates (_parent_id)`,

  // ─── gift_settings_wrapping_options (top-level array under collapsible) ───
  // user-defined `id` text → varchar PK
  // fields: id(text), label(text), fee_amount(numeric), description(text), active(boolean), sort_order(numeric)
  `CREATE TABLE IF NOT EXISTS site_settings_gift_settings_wrapping_options (
  id varchar PRIMARY KEY,
  _order integer NOT NULL,
  _parent_id integer NOT NULL REFERENCES site_settings(id) ON DELETE CASCADE,
  label varchar,
  fee_amount numeric DEFAULT 0,
  description text,
  active boolean DEFAULT true,
  sort_order numeric DEFAULT 0
)`,

  `CREATE INDEX IF NOT EXISTS site_settings_gift_settings_wrapping_options_order_idx
  ON site_settings_gift_settings_wrapping_options (_order)`,

  `CREATE INDEX IF NOT EXISTS site_settings_gift_settings_wrapping_options_parent_id_idx
  ON site_settings_gift_settings_wrapping_options (_parent_id)`,
]

try {
  console.log(`\n=== Add shipping_plans.available_time_slots table ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  for (const sql of stmts) {
    const preview = sql.replace(/\s+/g, ' ').trim().slice(0, 120)
    if (DRY_RUN) {
      console.log('  [DRY] ' + preview + '...')
    } else {
      console.log('  RUN: ' + preview + '...')
      await pool.query(sql)
      console.log('       ✓ OK')
    }
  }

  if (!DRY_RUN) {
    const r = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'site_settings_shipping_plans_available_time_slots',
          'site_settings_gift_settings_message_card_templates',
          'site_settings_gift_settings_wrapping_options'
        )
      ORDER BY table_name
    `)
    console.log('\nVerification:')
    for (const row of r.rows) console.log('  ✓', row.table_name)
  }

  console.log('\n=== Done ===\n')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
