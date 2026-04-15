/**
 * order-confirm テンプレートの bodyBlocks 初期データを投入する seed スクリプト。
 * 冪等: 既に bodyBlocks が存在する場合は削除してから再挿入（上書き）する。
 *
 * 実行:
 *   node scripts/seed-email-templates.mjs --dry-run  # INSERT 予定内容を表示
 *   node scripts/seed-email-templates.mjs            # 本番投入
 *
 * 前提: db-add-email-templates-body-blocks.mjs を先に実行して
 *   email_templates_body_blocks テーブルが存在すること。
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

const TARGET_SLUG = 'order-confirm'

// order-confirm の初期 bodyBlocks（email-templates.tsx の既存文言と対応）
const initialBlocks = [
  {
    blockKey: 'greeting',
    content: '{{name}} 様、ご注文ありがとうございます。',
  },
  {
    blockKey: 'intro',
    content: '以下の内容でご注文を承りました。内容をご確認ください。',
  },
  {
    blockKey: 'bank_transfer_lead',
    content:
      '以下の口座までお振込みをお願いいたします。期限までにご入金が確認できない場合、ご注文はキャンセルとなります。',
  },
  {
    blockKey: 'thanks_message',
    content: 'この度はご注文いただきありがとうございました。',
  },
  {
    blockKey: 'footer_note',
    content:
      'ご不明な点はお問い合わせページよりお気軽にご連絡ください。\nuballoon - バルーンギフトEC',
  },
]

try {
  console.log(`\n=== Seed email template bodyBlocks: ${TARGET_SLUG} ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  // 1) email_templates から order-confirm を検索
  const templateResult = await pool.query(
    `SELECT id FROM email_templates WHERE slug = $1 LIMIT 1`,
    [TARGET_SLUG],
  )

  let templateId
  if (templateResult.rows.length === 0) {
    // テンプレート自体が存在しない場合は作成する
    console.log(`  Template '${TARGET_SLUG}' not found. Creating...`)
    if (!DRY_RUN) {
      const insertResult = await pool.query(
        `INSERT INTO email_templates (name, slug, subject, body, updated_at, created_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [
          'ご注文確認メール',
          TARGET_SLUG,
          '【uballoon】ご注文確認 {{orderNumber}}',
          '{{name}} 様、ご注文ありがとうございます。\n\n注文番号: {{orderNumber}}\n\nご不明な点はお問い合わせください。',
        ],
      )
      templateId = insertResult.rows[0].id
      console.log(`  Created template id=${templateId}`)
    } else {
      console.log(
        '  [DRY RUN] Would create template with subject: 【uballoon】ご注文確認 {{orderNumber}}',
      )
      templateId = null
    }
  } else {
    templateId = templateResult.rows[0].id
    console.log(`  Found template id=${templateId}`)
  }

  // 2) 既存 bodyBlocks の確認（冪等処理）
  if (templateId != null) {
    const existingBlocks = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM email_templates_body_blocks WHERE _parent_id = $1`,
      [templateId],
    )
    const existingCount = existingBlocks.rows[0].cnt
    if (existingCount > 0) {
      console.log(
        `  Found ${existingCount} existing bodyBlocks. Will delete and re-insert (idempotent).`,
      )
      if (!DRY_RUN) {
        await pool.query(
          `DELETE FROM email_templates_body_blocks WHERE _parent_id = $1`,
          [templateId],
        )
        console.log(`  Deleted existing blocks.`)
      } else {
        console.log(`  [DRY RUN] Would delete existing ${existingCount} blocks.`)
      }
    }
  }

  // 3) bodyBlocks 投入
  console.log(`\n  Blocks to insert: ${initialBlocks.length}`)
  for (const b of initialBlocks) {
    console.log(`    - ${b.blockKey}: "${b.content.slice(0, 40)}..."`)
  }

  if (DRY_RUN) {
    console.log('\n  [DRY RUN] No data inserted.')
  } else if (templateId != null) {
    for (let i = 0; i < initialBlocks.length; i++) {
      const b = initialBlocks[i]
      await pool.query(
        `INSERT INTO email_templates_body_blocks (_order, _parent_id, block_key, content)
         VALUES ($1, $2, $3, $4)`,
        [i, templateId, b.blockKey, b.content],
      )
      console.log(`  Inserted: ${b.blockKey}`)
    }
    console.log(`\n  All ${initialBlocks.length} blocks inserted.`)
  }

  console.log('\n=== Done ===\n')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
