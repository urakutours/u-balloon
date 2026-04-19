/**
 * チェックアウト再設計で追加したフィールド群の DB カラム確認スクリプト。
 *
 * 重要: 実行前に必ず `npm run build` でスキーマ整合を確認してください。
 * Payload v3 は起動時に auto-migrate（Drizzle ORM）するため、
 * 実際の ALTER TABLE はこのスクリプトではなく Payload の自動マイグレーションに任せます。
 * このスクリプトは「新カラムが正しく存在するか」の確認専用です。
 *
 * 実行:
 *   node scripts/db-add-checkout-redesign-columns.mjs
 *
 * 新フィールドと DB カラム名のマッピング（Payload v3: camelCase → snake_case + group prefix）:
 *   isGuestOrder                          → orders.is_guest_order
 *   sender.senderName                     → orders.sender_sender_name
 *   sender.senderNameKana                 → orders.sender_sender_name_kana
 *   sender.senderEmail                    → orders.sender_sender_email
 *   sender.senderPhone                    → orders.sender_sender_phone
 *   sender.senderPostalCode               → orders.sender_sender_postal_code
 *   sender.senderPrefecture               → orders.sender_sender_prefecture
 *   sender.senderAddressLine1             → orders.sender_sender_address_line1
 *   sender.senderAddressLine2             → orders.sender_sender_address_line2
 *   recipient.recipientSameAsSender       → orders.recipient_recipient_same_as_sender
 *   recipient.recipientName               → orders.recipient_recipient_name
 *   recipient.recipientNameKana           → orders.recipient_recipient_name_kana
 *   recipient.recipientPhone              → orders.recipient_recipient_phone
 *   recipient.recipientPostalCode         → orders.recipient_recipient_postal_code
 *   recipient.recipientPrefecture         → orders.recipient_recipient_prefecture
 *   recipient.recipientAddressLine1       → orders.recipient_recipient_address_line1
 *   recipient.recipientAddressLine2       → orders.recipient_recipient_address_line2
 *   recipient.recipientDesiredArrivalDate → orders.recipient_recipient_desired_arrival_date
 *   recipient.recipientDesiredTimeSlotValue → orders.recipient_recipient_desired_time_slot_value
 *   recipient.recipientDesiredTimeSlotLabel → orders.recipient_recipient_desired_time_slot_label
 *   giftSettings.giftWrappingOptionId     → orders.gift_settings_gift_wrapping_option_id
 *   giftSettings.giftWrappingOptionName   → orders.gift_settings_gift_wrapping_option_name
 *   giftSettings.giftWrappingFee          → orders.gift_settings_gift_wrapping_fee
 *   giftSettings.giftMessageCardTemplateId → orders.gift_settings_gift_message_card_template_id
 *   giftSettings.giftMessageCardText      → orders.gift_settings_gift_message_card_text
 *   usageInfo.usageEventName              → orders.usage_info_usage_event_name
 *   usageInfo.usageDate                   → orders.usage_info_usage_date
 *   usageInfo.usageTimeText               → orders.usage_info_usage_time_text
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
  // .env が無い場合は環境変数から直接取得（CI/本番環境など）
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL が設定されていません。.env ファイルを確認してください。')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

/** チェック対象の新カラム一覧 */
const EXPECTED_COLUMNS = [
  'is_guest_order',
  'sender_sender_name',
  'sender_sender_name_kana',
  'sender_sender_email',
  'sender_sender_phone',
  'sender_sender_postal_code',
  'sender_sender_prefecture',
  'sender_sender_address_line1',
  'sender_sender_address_line2',
  'recipient_recipient_same_as_sender',
  'recipient_recipient_name',
  'recipient_recipient_name_kana',
  'recipient_recipient_phone',
  'recipient_recipient_postal_code',
  'recipient_recipient_prefecture',
  'recipient_recipient_address_line1',
  'recipient_recipient_address_line2',
  'recipient_recipient_desired_arrival_date',
  'recipient_recipient_desired_time_slot_value',
  'recipient_recipient_desired_time_slot_label',
  'gift_settings_gift_wrapping_option_id',
  'gift_settings_gift_wrapping_option_name',
  'gift_settings_gift_wrapping_fee',
  'gift_settings_gift_message_card_template_id',
  'gift_settings_gift_message_card_text',
  'usage_info_usage_event_name',
  'usage_info_usage_date',
  'usage_info_usage_time_text',
]

try {
  console.log('\n=== チェックアウト再設計カラム確認 ===\n')

  // orders テーブルの全カラムを取得
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'orders'
    ORDER BY ordinal_position
  `)

  const existingColumns = new Set(result.rows.map((r) => r.column_name))

  const missing = []
  const present = []

  for (const col of EXPECTED_COLUMNS) {
    if (existingColumns.has(col)) {
      present.push(col)
    } else {
      missing.push(col)
    }
  }

  if (present.length > 0) {
    console.log('存在するカラム:')
    for (const col of present) {
      console.log(`  OK  orders.${col}`)
    }
  }

  if (missing.length > 0) {
    console.log('\n存在しないカラム:')
    for (const col of missing) {
      console.log(`  -- orders.${col}`)
    }
    console.log(`
NOTE: ${missing.length} 個のカラムが見つかりません。
Payload v3 の自動マイグレーションが必要です。以下の手順を実行してください:

  1. npm run build        # スキーマを最新化
  2. npm run start        # サーバー起動時に auto-migrate が実行されます
     （または開発環境では npm run dev）

その後、再度このスクリプトを実行して確認してください。
`)
  } else {
    console.log('\n全カラム確認完了。新規フィールドはすべて存在します。\n')
  }

  // 参考: orders テーブルの全カラム一覧を表示
  console.log(`--- orders テーブル全カラム (${result.rows.length} 件) ---`)
  for (const row of result.rows) {
    console.log(`  ${row.column_name.padEnd(50)} ${row.data_type}`)
  }
  console.log('')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
