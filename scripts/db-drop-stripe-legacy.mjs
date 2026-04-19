/**
 * 旧 Stripe フィールド（stripe_secret_key / stripe_webhook_secret）を DROP する。
 *
 * 背景:
 *   - 2026-04-07 の commit a80cb08 で schema（SiteSettings.ts）から削除済み
 *   - 新 stripe_test_* / stripe_live_* フィールドに値が移行済みなのを db-check-stripe-legacy.mjs で確認済み
 *   - DB にだけ 12 日間残っていたせいで、Payload v3 push モードが検出して同期を要求してくる
 *
 * 本スクリプトは:
 *   1) 旧カラムの現在値を scripts/backups/stripe-legacy-YYYYMMDD-HHMMSS.json に退避
 *   2) ALTER TABLE site_settings DROP COLUMN ... を実行
 *   3) 冪等（既に存在しない場合はスキップ）
 */
import pg from 'pg'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const LEGACY_COLS = ['stripe_secret_key', 'stripe_webhook_secret']

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  const existing = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = ANY($1)
  `, [LEGACY_COLS])

  const present = existing.rows.map(r => r.column_name)
  if (present.length === 0) {
    console.log('(no legacy columns present — nothing to do)')
    process.exit(0)
  }
  console.log('Legacy columns present:', present)

  const backupSql = `SELECT id, ${present.join(', ')} FROM site_settings`
  const backupData = await pool.query(backupSql)

  const backupDir = resolve(import.meta.dirname, 'backups')
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const backupFile = resolve(backupDir, `stripe-legacy-${ts}.json`)
  writeFileSync(backupFile, JSON.stringify(backupData.rows, null, 2), 'utf-8')
  console.log('Backup written:', backupFile, `(${backupData.rows.length} rows)`)

  for (const col of present) {
    console.log(`Dropping column ${col}...`)
    await pool.query(`ALTER TABLE site_settings DROP COLUMN IF EXISTS ${col}`)
  }

  const after = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'site_settings' AND column_name = ANY($1)
  `, [LEGACY_COLS])
  console.log('After DROP — remaining legacy columns:', after.rows.map(r => r.column_name))
  console.log('Done.')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
