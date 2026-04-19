/**
 * チェックアウト再設計で追加したフィールド群を orders テーブルに追加するマイグレーション。
 *
 * 実行:
 *   node scripts/db-migrate-checkout-redesign.mjs
 *
 * 冪等: IF NOT EXISTS で実行済みでも安全に再実行可能。
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].trim()
  }
} catch {
  // .env が無い場合は環境変数から取得（Vercel CLI 実行時など）
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL が設定されていません。')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  console.log('\n=== チェックアウト再設計カラム追加マイグレーション ===\n')

  await pool.query(`
    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS is_guest_order                              bool        NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS sender_sender_name                          varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_name_kana                     varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_email                         varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_phone                         varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_postal_code                   varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_prefecture                    varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_address_line1                 varchar     NULL,
      ADD COLUMN IF NOT EXISTS sender_sender_address_line2                 varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_same_as_sender          bool        NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS recipient_recipient_name                    varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_name_kana               varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_phone                   varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_postal_code             varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_prefecture              varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_address_line1           varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_address_line2           varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_desired_arrival_date    timestamptz NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_desired_time_slot_value varchar     NULL,
      ADD COLUMN IF NOT EXISTS recipient_recipient_desired_time_slot_label varchar     NULL,
      ADD COLUMN IF NOT EXISTS gift_settings_gift_wrapping_option_id       varchar     NULL,
      ADD COLUMN IF NOT EXISTS gift_settings_gift_wrapping_option_name     varchar     NULL,
      ADD COLUMN IF NOT EXISTS gift_settings_gift_wrapping_fee             numeric     NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS gift_settings_gift_message_card_template_id varchar     NULL,
      ADD COLUMN IF NOT EXISTS gift_settings_gift_message_card_text        varchar     NULL,
      ADD COLUMN IF NOT EXISTS usage_info_usage_event_name                 varchar     NULL,
      ADD COLUMN IF NOT EXISTS usage_info_usage_date                       timestamptz NULL,
      ADD COLUMN IF NOT EXISTS usage_info_usage_time_text                  varchar     NULL
  `)

  console.log('OK  28カラムを追加しました（既存カラムはスキップ）\n')

  // 確認
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `)
  console.log(`orders テーブル合計カラム数: ${result.rows.length}`)
  console.log('完了\n')
} catch (err) {
  console.error('マイグレーション失敗:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
