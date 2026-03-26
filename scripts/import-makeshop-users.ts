/**
 * MakeShop会員データCSVインポートスクリプト
 *
 * Usage:
 *   npx tsx scripts/import-makeshop-users.ts <csv-file> [--execute] [--verbose]
 *
 * CSV format (UTF-8 with BOM OK):
 *   会員ID, メール, 氏名, 電話番号, ポイント残高, 登録日
 *
 * Options:
 *   (default)   ドライランモード — DBに書き込まず処理内容を表示
 *   --execute   実際にDBへ書き込む（dev server が起動している必要あり）
 *   --verbose   詳細ログを出力
 *   --base-url  サーバーURL (default: http://localhost:3020)
 *
 * Requires: dev server running + admin account for --execute mode
 *   Admin credentials can be set via env vars:
 *     IMPORT_ADMIN_EMAIL (default: admin@uballoon.com)
 *     IMPORT_ADMIN_PASSWORD (default: admin123456)
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ------------------------------------------------------------------
// 1. Load .env
// ------------------------------------------------------------------
const projectDir = path.resolve(import.meta.dirname ?? __dirname, '..')
const envPath = path.join(projectDir, '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

// ------------------------------------------------------------------
// 2. CLI args
// ------------------------------------------------------------------
const args = process.argv.slice(2)
const csvFilePath = args.find((a) => !a.startsWith('--'))
const isExecute = args.includes('--execute')
const isDryRun = !isExecute
const isVerbose = args.includes('--verbose')

const baseUrlIdx = args.indexOf('--base-url')
const BASE_URL = baseUrlIdx !== -1 && args[baseUrlIdx + 1]
  ? args[baseUrlIdx + 1]
  : process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3020'

const ADMIN_EMAIL = process.env.IMPORT_ADMIN_EMAIL || 'admin@uballoon.com'
const ADMIN_PASSWORD = process.env.IMPORT_ADMIN_PASSWORD || 'admin123456'

if (!csvFilePath) {
  console.error(
    `Usage: npx tsx scripts/import-makeshop-users.ts <csv-file> [--execute] [--verbose]

Options:
  (default)       Dry-run mode — no DB writes
  --execute       Actually write to DB (requires dev server running)
  --verbose       Show detailed per-row logs
  --base-url URL  Server URL (default: http://localhost:3020)

CSV columns: 会員ID, メール, 氏名, 電話番号, ポイント残高, 登録日`,
  )
  process.exit(1)
}

// ------------------------------------------------------------------
// 3. CSV parser (no external dependency)
// ------------------------------------------------------------------
type CsvRow = {
  memberId: string
  email: string
  name: string
  phone: string
  points: number
  registeredAt: string
}

function parseCSV(filePath: string): CsvRow[] {
  let raw = fs.readFileSync(filePath, 'utf-8')
  // Strip UTF-8 BOM
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) {
    throw new Error('CSV must have a header row + at least one data row')
  }

  const header = lines[0].split(',').map((h) => h.trim().replace(/^"(.*)"$/, '$1'))
  console.log(`  CSV header: [${header.join(', ')}]`)

  // Map known column names → index (flexible matching)
  const colMap: Record<string, number> = {}
  const mappings: Record<string, string[]> = {
    memberId: ['会員ID', '会員id', 'member_id', 'memberid', 'id'],
    email: ['メール', 'メールアドレス', 'email', 'mail'],
    name: ['氏名', '名前', 'name', '会員名'],
    phone: ['電話番号', '電話', 'phone', 'tel'],
    points: ['ポイント残高', 'ポイント', 'points', 'point'],
    registeredAt: ['登録日', '登録日時', 'registered_at', 'created_at', 'registeredat'],
  }

  for (const [key, candidates] of Object.entries(mappings)) {
    const idx = header.findIndex((h) =>
      candidates.some((c) => h.toLowerCase() === c.toLowerCase()),
    )
    if (idx === -1) {
      throw new Error(
        `Required column "${key}" not found. Expected one of: ${candidates.join(', ')}. Got: ${header.join(', ')}`,
      )
    }
    colMap[key] = idx
  }

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < header.length) {
      console.warn(`  [WARN] Line ${i + 1}: column count mismatch (${cols.length}/${header.length}), skipping`)
      continue
    }
    rows.push({
      memberId: cols[colMap.memberId].trim(),
      email: cols[colMap.email].trim().toLowerCase(),
      name: cols[colMap.name].trim(),
      phone: cols[colMap.phone].trim(),
      points: parseInt(cols[colMap.points], 10) || 0,
      registeredAt: cols[colMap.registeredAt].trim(),
    })
  }

  return rows
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
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
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current)
  return result
}

// ------------------------------------------------------------------
// 4. Password generation
// ------------------------------------------------------------------
function generateTempPassword(): string {
  // 12 chars, URL-safe, easy to read (no ambiguous chars: 0/O, 1/l/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(12)
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}

// ------------------------------------------------------------------
// 5. REST API client (uses Payload REST API via dev server)
// ------------------------------------------------------------------
let authToken = ''

async function apiLogin(): Promise<void> {
  console.log(`  Logging in as ${ADMIN_EMAIL} at ${BASE_URL}...`)
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Admin login failed (${res.status}): ${text}`)
  }
  const data = await res.json()
  authToken = data.token
  console.log(`  Login successful (admin id: ${data.user?.id})\n`)
}

async function apiFind(collection: string, where: Record<string, any>): Promise<any[]> {
  // Build Payload REST API query string: where[field][operator]=value
  const params = new URLSearchParams()
  for (const [field, condition] of Object.entries(where)) {
    if (typeof condition === 'object' && condition !== null) {
      for (const [op, val] of Object.entries(condition)) {
        params.set(`where[${field}][${op}]`, String(val))
      }
    }
  }
  params.set('limit', '1')

  const res = await fetch(`${BASE_URL}/api/${collection}?${params.toString()}`, {
    headers: { Authorization: `JWT ${authToken}` },
  })
  if (!res.ok) throw new Error(`Find ${collection} failed: ${res.status}`)
  const data = await res.json()
  return data.docs || []
}

async function apiCreate(collection: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/${collection}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${authToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Create ${collection} failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function apiUpdate(collection: string, id: string, body: Record<string, any>): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/${collection}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${authToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Update ${collection}/${id} failed (${res.status}): ${text}`)
  }
  return res.json()
}

// ------------------------------------------------------------------
// 6. Main import logic
// ------------------------------------------------------------------
type ImportResult = {
  total: number
  created: number
  skipped: number
  errors: { row: number; email: string; error: string }[]
  passwordList: { email: string; tempPassword: string }[]
}

async function importUsers(rows: CsvRow[], dryRun: boolean): Promise<ImportResult> {
  const result: ImportResult = {
    total: rows.length,
    created: 0,
    skipped: 0,
    errors: [],
    passwordList: [],
  }

  if (dryRun) {
    console.log('\n=== DRY RUN MODE (DBへの書き込みは行いません) ===\n')
  } else {
    console.log('\n=== EXECUTE MODE (DBに書き込みます) ===\n')
    await apiLogin()
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // header=1, first data=2

    // Validate
    if (!row.email || !row.email.includes('@')) {
      result.errors.push({ row: rowNum, email: row.email, error: 'Invalid email' })
      if (isVerbose) console.log(`  [ERROR] Row ${rowNum}: Invalid email "${row.email}"`)
      continue
    }
    if (!row.memberId) {
      result.errors.push({ row: rowNum, email: row.email, error: 'Missing memberId' })
      if (isVerbose) console.log(`  [ERROR] Row ${rowNum}: Missing memberId`)
      continue
    }

    const tempPassword = generateTempPassword()

    if (dryRun) {
      if (isVerbose) {
        console.log(
          `  [DRY] Row ${rowNum}: ${row.email} (ID: ${row.memberId}, points: ${row.points})`,
        )
      }
      result.created++
      result.passwordList.push({ email: row.email, tempPassword })
      continue
    }

    // ---- Execute mode ----
    try {
      // Check for existing user by email
      const existingByEmail = await apiFind('users', { email: { equals: row.email } })
      if (existingByEmail.length > 0) {
        if (isVerbose)
          console.log(`  [SKIP] Row ${rowNum}: ${row.email} already exists (id: ${existingByEmail[0].id})`)
        result.skipped++
        continue
      }

      // Check by legacyId
      const existingByLegacy = await apiFind('users', { legacyId: { equals: row.memberId } })
      if (existingByLegacy.length > 0) {
        if (isVerbose)
          console.log(`  [SKIP] Row ${rowNum}: legacyId ${row.memberId} already exists`)
        result.skipped++
        continue
      }

      // Create user via REST API with points set directly
      // Note: pointAdjustHook only fires on 'update' operation when
      // points differs from originalDoc, so 'create' with points is safe
      const createData: any = {
        email: row.email,
        password: tempPassword,
        role: 'customer',
        name: row.name || undefined,
        phone: row.phone || undefined,
        points: row.points,
        legacyId: row.memberId,
        legacyData: {
          makeshopId: row.memberId,
          importedAt: new Date().toISOString(),
          registeredAt: row.registeredAt,
          requirePasswordChange: true,
        },
      }

      const newUserRes = await apiCreate('users', createData)
      const newUserId = newUserRes.doc?.id || newUserRes.id

      // Create PointTransaction for migration balance
      if (row.points > 0) {
        await apiCreate('point-transactions', {
          user: newUserId,
          type: 'migration',
          amount: row.points,
          balance: row.points,
          description: `MakeShopからのポイント移行 (旧会員ID: ${row.memberId})`,
        })
      }

      result.created++
      result.passwordList.push({ email: row.email, tempPassword })

      if (isVerbose) {
        console.log(
          `  [OK] Row ${rowNum}: ${row.email} → userId: ${newUserId}, points: ${row.points}`,
        )
      } else if (result.created % 50 === 0) {
        console.log(`  ... ${result.created}/${result.total} processed`)
      }
    } catch (err: any) {
      const msg = err?.message || String(err)
      result.errors.push({ row: rowNum, email: row.email, error: msg })
      console.error(`  [ERROR] Row ${rowNum}: ${row.email} - ${msg}`)
    }
  }

  return result
}

// ------------------------------------------------------------------
// 7. Report
// ------------------------------------------------------------------
function printReport(result: ImportResult, dryRun: boolean) {
  console.log('\n' + '='.repeat(60))
  console.log(dryRun ? '  IMPORT DRY-RUN REPORT' : '  IMPORT EXECUTION REPORT')
  console.log('='.repeat(60))
  console.log(`  Total rows:  ${result.total}`)
  console.log(`  Created:     ${result.created}`)
  console.log(`  Skipped:     ${result.skipped}`)
  console.log(`  Errors:      ${result.errors.length}`)
  console.log('='.repeat(60))

  if (result.errors.length > 0) {
    console.log('\n  Errors:')
    for (const e of result.errors) {
      console.log(`    Row ${e.row}: ${e.email} — ${e.error}`)
    }
  }

  // Write password list to file
  if (result.passwordList.length > 0) {
    const outDir = path.dirname(path.resolve(csvFilePath!))
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const suffix = dryRun ? 'dryrun' : 'passwords'
    const outFile = path.join(outDir, `import-${suffix}-${timestamp}.csv`)

    const csv = [
      'email,tempPassword',
      ...result.passwordList.map((p) => `${p.email},${p.tempPassword}`),
    ].join('\n')

    fs.writeFileSync(outFile, csv, 'utf-8')
    console.log(`\n  Password list saved to: ${outFile}`)

    if (dryRun) {
      console.log('  (This is a dry-run preview — passwords are NOT final)\n')
    } else {
      console.log('  ⚠  Keep this file secure and share passwords with users securely!\n')
    }
  }
}

// ------------------------------------------------------------------
// 8. Run
// ------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60))
  console.log('  MakeShop → Payload User Import')
  console.log('='.repeat(60))
  console.log(`  CSV file:    ${csvFilePath}`)
  console.log(`  Mode:        ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`)
  console.log(`  Server URL:  ${BASE_URL}`)
  console.log(`  Verbose:     ${isVerbose}`)
  console.log('')

  if (!fs.existsSync(csvFilePath!)) {
    console.error(`  File not found: ${csvFilePath}`)
    process.exit(1)
  }

  console.log('  Parsing CSV...')
  const rows = parseCSV(csvFilePath!)
  console.log(`  Parsed ${rows.length} rows\n`)

  if (rows.length === 0) {
    console.log('  No data to import.')
    process.exit(0)
  }

  // Show preview
  console.log('  Preview (first 5 rows):')
  for (const row of rows.slice(0, 5)) {
    console.log(
      `    ${row.memberId} | ${row.email} | ${row.name} | ${row.phone} | ${row.points}pt | ${row.registeredAt}`,
    )
  }
  if (rows.length > 5) console.log(`    ... and ${rows.length - 5} more rows`)
  console.log('')

  const result = await importUsers(rows, isDryRun)
  printReport(result, isDryRun)

  if (isDryRun) {
    console.log('  To actually import, run with --execute flag:')
    console.log(`    npx tsx scripts/import-makeshop-users.ts ${csvFilePath} --execute\n`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
