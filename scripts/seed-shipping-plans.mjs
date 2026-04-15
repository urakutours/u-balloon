/**
 * 旧 SiteSettings の配送料設定から shippingPlans に自動投入する seed スクリプト。
 * 冪等: 既に shippingPlans が存在する場合は何もしない。
 *
 * 実行:
 *   node scripts/seed-shipping-plans.mjs --dry-run  # INSERT 予定 SQL 表示
 *   node scripts/seed-shipping-plans.mjs            # 本番投入
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

try {
  console.log(`\n=== Seed shipping plans from legacy settings ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  // 1) site_settings から旧フィールドを取得
  const cur = await pool.query(`
    SELECT id,
           shipping_standard_base_fee, shipping_standard_free_distance_km,
           shipping_delivery_base_fee, shipping_delivery_free_distance_km,
           shipping_extra_per_km_fee, shipping_delivery_free_threshold,
           shipping_restricted_areas
    FROM site_settings LIMIT 1
  `)
  if (cur.rows.length === 0) {
    console.log('  site_settings row not found. abort.')
    process.exit(0)
  }
  const row = cur.rows[0]

  // 2) 既存 shippingPlans の数を確認 (冪等性)
  const existing = await pool.query(
    'SELECT COUNT(*)::int AS cnt FROM site_settings_shipping_plans WHERE _parent_id = $1',
    [row.id],
  )
  if (existing.rows[0].cnt > 0) {
    console.log(`  shippingPlans already has ${existing.rows[0].cnt} entries. skipping seed.`)
    process.exit(0)
  }

  // 3) 投入するデータを構築
  const plans = []
  if (row.shipping_standard_base_fee != null) {
    plans.push({
      _order: 0,
      _parent_id: row.id,
      name: '通常配送',
      carrier: 'yamato',
      calculation_method: 'distance_based',
      base_fee: row.shipping_standard_base_fee,
      free_distance_km: row.shipping_standard_free_distance_km ?? 0,
      extra_per_km_fee: row.shipping_extra_per_km_fee ?? 0,
      free_threshold: null,
      estimated_days_min: 2,
      estimated_days_max: 4,
      supported_areas: '全国（沖縄・離島を除く）',
      restricted_areas: row.shipping_restricted_areas,
      active: true,
      sort_order: 10,
      notes: '（旧設定からの自動変換）',
    })
  }
  if (row.shipping_delivery_base_fee != null) {
    plans.push({
      _order: 1,
      _parent_id: row.id,
      name: 'u-balloon デリバリー便',
      carrier: 'self_delivery',
      calculation_method: 'distance_based',
      base_fee: row.shipping_delivery_base_fee,
      free_distance_km: row.shipping_delivery_free_distance_km ?? 0,
      extra_per_km_fee: row.shipping_extra_per_km_fee ?? 0,
      free_threshold: row.shipping_delivery_free_threshold,
      estimated_days_min: 0,
      estimated_days_max: 1,
      supported_areas: '東京都内',
      restricted_areas: null,
      active: true,
      sort_order: 20,
      notes: '（旧設定からの自動変換・自社配送）',
    })
  }

  if (plans.length === 0) {
    console.log('  No legacy shipping fields found. nothing to seed.')
    process.exit(0)
  }

  console.log(`  Plans to insert: ${plans.length}`)
  for (const p of plans) console.log(`    - ${p.name} (${p.carrier}, ${p.calculation_method})`)

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] No data inserted.')
    process.exit(0)
  }

  // 4) INSERT 実行
  for (const p of plans) {
    await pool.query(
      `INSERT INTO site_settings_shipping_plans (
        _order, _parent_id, name, carrier, calculation_method,
        base_fee, free_distance_km, extra_per_km_fee, free_threshold,
        estimated_days_min, estimated_days_max,
        supported_areas, restricted_areas,
        active, sort_order, notes
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13,
        $14, $15, $16
      )`,
      [
        p._order, p._parent_id, p.name, p.carrier, p.calculation_method,
        p.base_fee, p.free_distance_km, p.extra_per_km_fee, p.free_threshold,
        p.estimated_days_min, p.estimated_days_max,
        p.supported_areas, p.restricted_areas,
        p.active, p.sort_order, p.notes,
      ],
    )
    console.log(`  Inserted: ${p.name}`)
  }

  console.log('\n=== Done ===\n')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
