/**
 * SiteSettings の shippingPlans (array) と regionalFees (nested array) 用の
 * DB テーブルを作成する一度きりのマイグレーションスクリプト。
 * Payload v3 + @payloadcms/db-postgres の命名規則に従う。
 *
 * 実行:
 *   node scripts/db-add-shipping-plans.mjs --dry-run  # 発行予定SQLを表示
 *   node scripts/db-add-shipping-plans.mjs            # 本番適用
 *
 * 既存: db-fix-site-settings.mjs, db-migrate.mjs 同様のパターン
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
  // 1) 親テーブル: site_settings_shipping_plans
  `CREATE TABLE IF NOT EXISTS site_settings_shipping_plans (
  id serial PRIMARY KEY,
  _order integer NOT NULL,
  _parent_id integer NOT NULL REFERENCES site_settings(id) ON DELETE CASCADE,
  name varchar,
  carrier varchar,
  calculation_method varchar,
  base_fee numeric,
  free_distance_km numeric,
  extra_per_km_fee numeric,
  free_threshold numeric,
  estimated_days_min numeric,
  estimated_days_max numeric,
  supported_areas text,
  restricted_areas varchar,
  active boolean DEFAULT true,
  sort_order numeric,
  notes text
)`,

  `CREATE INDEX IF NOT EXISTS site_settings_shipping_plans_order_idx
  ON site_settings_shipping_plans (_order)`,

  `CREATE INDEX IF NOT EXISTS site_settings_shipping_plans_parent_id_idx
  ON site_settings_shipping_plans (_parent_id)`,

  // 2) 子テーブル: site_settings_shipping_plans_regional_fees
  `CREATE TABLE IF NOT EXISTS site_settings_shipping_plans_regional_fees (
  id serial PRIMARY KEY,
  _order integer NOT NULL,
  _parent_id integer NOT NULL REFERENCES site_settings_shipping_plans(id) ON DELETE CASCADE,
  region varchar,
  fee numeric,
  note varchar
)`,

  `CREATE INDEX IF NOT EXISTS site_settings_shipping_plans_regional_fees_order_idx
  ON site_settings_shipping_plans_regional_fees (_order)`,

  `CREATE INDEX IF NOT EXISTS site_settings_shipping_plans_regional_fees_parent_id_idx
  ON site_settings_shipping_plans_regional_fees (_parent_id)`,

  // 3) orders テーブルに shippingPlan 参照と scheduledShipDate を追加
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_plan_id varchar`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_plan_name varchar`,
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS scheduled_ship_date timestamptz`,
]

try {
  console.log(`\n=== Add shipping plans tables ===`)
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
        AND table_name IN ('site_settings_shipping_plans', 'site_settings_shipping_plans_regional_fees')
      ORDER BY table_name
    `)
    console.log('\nVerification:')
    for (const row of r.rows) console.log('  ✓', row.table_name)

    const cols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders'
        AND column_name IN ('shipping_plan_id', 'shipping_plan_name', 'scheduled_ship_date')
    `)
    console.log('Orders new columns:', cols.rows.map(r => r.column_name).join(', '))
  }

  console.log('\n=== Done ===\n')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
