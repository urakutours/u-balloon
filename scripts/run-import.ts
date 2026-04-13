/**
 * run-import.ts — Payload Local API 経由で CSV インポートを実行するワンショットスクリプト
 *
 * Usage:
 *   npx tsx scripts/run-import.ts <csv-file> [--dry-run]
 *
 * ローカルの .env の DATABASE_URL を使って Neon DB に直接接続し、
 * HTTP 認証なしで Payload Local API を呼び出す。
 * import/customers API ルートと同じロジックを使用。
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'

// ---------------------------------------------------------------------------
// CSV parser (inline — same as src/lib/csv-utils.ts parseCsv)
// ---------------------------------------------------------------------------

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

function parseCsv(text: string): Record<string, string>[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.trim()) lines.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) lines.push(current)
  if (lines.length < 2) return []

  // Remove BOM
  let headerLine = lines[0]
  if (headerLine.charCodeAt(0) === 0xfeff) headerLine = headerLine.slice(1)

  const headers = parseCsvLine(headerLine).map(h => h.trim())
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] || '').trim()
    }
    rows.push(row)
  }
  return rows
}

// ---------------------------------------------------------------------------
// Helpers (same as import/customers/route.ts)
// ---------------------------------------------------------------------------

const VALID_PREFECTURES = new Set([
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
])

function parseGender(raw: string): 'male' | 'female' | 'unspecified' {
  const v = (raw || '').trim()
  if (v === '男性' || v === '男' || v === 'male' || v === 'Male') return 'male'
  if (v === '女性' || v === '女' || v === 'female' || v === 'Female') return 'female'
  return 'unspecified'
}

function parseBirthday(raw: string): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const m = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`)
  if (isNaN(date.getTime())) return null
  return date.toISOString()
}

function parseLegacyDate(raw: string): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const m = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (m) {
    const [, y, mo, d] = m
    const date = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`)
    if (!isNaN(date.getTime())) return date.toISOString()
    return null
  }
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) return date.toISOString()
  return null
}

function parseNewsletter(raw: string): boolean {
  const v = (raw || '').trim().toLowerCase()
  return v === 'true' || v === 'y' || v === '1' || v === 'はい'
}

function generateTempPassword(): string {
  return randomBytes(16).toString('hex')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args.find(a => !a.startsWith('--'))
  const dryRun = args.includes('--dry-run')

  if (!csvPath) {
    console.error('Usage: npx tsx scripts/run-import.ts <csv-file> [--dry-run]')
    process.exit(1)
  }

  const resolved = path.resolve(csvPath)
  console.log(`\n📂 Input: ${resolved}`)
  console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)

  // Read CSV
  const text = readFileSync(resolved, 'utf-8')
  const rows = parseCsv(text)
  console.log(`📊 Parsed ${rows.length} rows\n`)

  if (rows.length === 0) {
    console.error('❌ No data rows found')
    process.exit(1)
  }

  // Init Payload
  console.log('⏳ Initializing Payload...')
  const payload = await getPayload({ config })
  console.log('✅ Payload ready\n')

  const result = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; message: string }>,
  }

  const importedAt = new Date().toISOString()

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2

    try {
      const email = (row['メールアドレス'] || '').trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.errors.push({ row: rowNum, message: `メールアドレスが無効です: "${email}"` })
        continue
      }

      // Parse fields
      const nameKana = (row['フリガナ'] || row['氏名カナ'] || '').trim()
      const mobilePhone = (row['携帯電話番号'] || '').trim()
      const gender = parseGender(row['性別'] || '')
      const birthday = parseBirthday(row['生年月日'] || '')
      const newsletterSubscribed = parseNewsletter(row['メルマガ購読'] || '')
      const postalCode = (row['郵便番号'] || '').trim()
      const prefectureRaw = (row['都道府県'] || '').trim()
      const prefecture = VALID_PREFECTURES.has(prefectureRaw) ? prefectureRaw : undefined
      const addressLine1 = (row['住所1'] || row['市区町村・番地'] || '').trim()
      const addressLine2 = (row['住所2'] || row['建物名・部屋番号'] || '').trim()
      const legacyRegisteredAt = parseLegacyDate(row['旧登録日時'] || row['MakeShop登録日'] || '')

      let parsedLegacyData: Record<string, unknown> = {}
      const legacyDataRaw = (row['legacyData'] || '').trim()
      if (legacyDataRaw) {
        try {
          const parsed = JSON.parse(legacyDataRaw)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            parsedLegacyData = parsed as Record<string, unknown>
          }
        } catch { /* ignore */ }
      }

      const legacyId = (row['MakeShop移行ID'] || '').trim() || undefined

      const customerData: Record<string, unknown> = {
        name: (row['氏名'] || '').trim() || undefined,
        phone: (row['電話番号'] || '').trim() || undefined,
        defaultAddress: (row['デフォルト配送先住所'] || '').trim() || undefined,
        role: 'customer',
      }

      if (legacyId) customerData.legacyId = legacyId
      if (nameKana) customerData.nameKana = nameKana
      if (mobilePhone) customerData.mobilePhone = mobilePhone
      customerData.gender = gender
      if (birthday) customerData.birthday = birthday
      customerData.newsletterSubscribed = newsletterSubscribed
      if (postalCode) customerData.postalCode = postalCode
      if (prefecture) customerData.prefecture = prefecture
      if (addressLine1) customerData.addressLine1 = addressLine1
      if (addressLine2) customerData.addressLine2 = addressLine2
      if (legacyRegisteredAt) customerData.legacyRegisteredAt = legacyRegisteredAt

      for (const key of Object.keys(customerData)) {
        if (customerData[key] === undefined || customerData[key] === '') {
          delete customerData[key]
        }
      }

      // Lookup existing user
      type ExistingUser = { id: string; role?: string; email?: string; legacyData?: unknown }
      let existingUser: ExistingUser | null = null

      if (legacyId) {
        const byLegacyId = await payload.find({
          collection: 'users',
          where: { legacyId: { equals: legacyId } },
          limit: 1,
          depth: 0,
        })
        if (byLegacyId.docs.length > 0) {
          existingUser = byLegacyId.docs[0] as unknown as ExistingUser
        }
      }

      if (!existingUser) {
        const byEmail = await payload.find({
          collection: 'users',
          where: { email: { equals: email } },
          limit: 1,
          depth: 0,
        })
        if (byEmail.docs.length > 0) {
          existingUser = byEmail.docs[0] as unknown as ExistingUser
        }
      }

      if (existingUser) {
        if ((existingUser as { role?: string }).role === 'admin') {
          result.errors.push({ row: rowNum, message: `管理者アカウント (${email}) はスキップ` })
          continue
        }

        const existingEmail = (existingUser as { email?: string }).email || ''
        if (existingEmail.toLowerCase() !== email) {
          const emailConflict = await payload.find({
            collection: 'users',
            where: {
              and: [
                { email: { equals: email } },
                { id: { not_equals: existingUser.id } },
              ],
            },
            limit: 1,
            depth: 0,
          })
          if (emailConflict.docs.length > 0) {
            result.errors.push({ row: rowNum, message: `メール "${email}" は他ユーザーが使用中` })
            continue
          }
          customerData.email = email
        }

        const existingLegacyData =
          existingUser.legacyData && typeof existingUser.legacyData === 'object'
            ? (existingUser.legacyData as Record<string, unknown>)
            : {}
        customerData.legacyData = { ...existingLegacyData, ...parsedLegacyData }

        if (dryRun) {
          console.log(`  [DRY] UPDATE row ${rowNum}: ${email} (legacyId: ${legacyId || 'none'})`)
        } else {
          await payload.update({
            collection: 'users',
            id: existingUser.id,
            data: customerData as Parameters<typeof payload.update>[0]['data'],
            depth: 0,
            context: { skipWelcomeEmail: true, skipPointAdjustHook: true },
          })
        }
        result.updated++
      } else {
        const newLegacyData: Record<string, unknown> = {
          ...parsedLegacyData,
          source: parsedLegacyData.source ?? 'makeshop',
          importedAt,
          requirePasswordChange: true,
        }
        customerData.legacyData = newLegacyData

        if (dryRun) {
          console.log(`  [DRY] CREATE row ${rowNum}: ${email} (legacyId: ${legacyId || 'none'})`)
        } else {
          await payload.create({
            collection: 'users',
            data: {
              email,
              password: generateTempPassword(),
              ...customerData,
            } as Parameters<typeof payload.create>[0]['data'],
            depth: 0,
            context: { skipWelcomeEmail: true },
          })
        }
        result.created++
      }

      // Progress
      if ((index + 1) % 100 === 0) {
        console.log(`  ... ${index + 1}/${rows.length} processed`)
      }
    } catch (err) {
      result.errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : '不明なエラー',
      })
    }
  }

  // Summary
  console.log('\n=== Import Summary ===')
  console.log(`  Total:   ${result.total}`)
  console.log(`  Created: ${result.created}`)
  console.log(`  Updated: ${result.updated}`)
  console.log(`  Skipped: ${result.skipped}`)
  console.log(`  Errors:  ${result.errors.length}`)
  if (result.errors.length > 0) {
    console.log('\n  Error details:')
    result.errors.forEach(e => console.log(`    Row ${e.row}: ${e.message}`))
  }
  console.log('======================\n')

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
