/**
 * MakeShop raw CSV → u-balloon インポート形式変換スクリプト
 *
 * Usage:
 *   npx tsx scripts/convert-makeshop-csv.ts <input.csv> [options]
 *
 * Input:
 *   MakeShop エクスポート CSV（コンマ区切りまたはタブ区切り、UTF-8 または Shift_JIS）
 *   文字コードと区切り文字は自動検出（--encoding / --delimiter で明示指定も可能）
 *
 * Output:
 *   customers_import_YYYY-MM-DD.csv    — /api/admin/import/customers 用（BOM 付き UTF-8）
 *   points_migration_YYYY-MM-DD.json   — /api/admin/migrate-points 用（0pt 除外）
 *   conversion_report_YYYY-MM-DD.json  — 変換サマリレポート
 *
 * Options:
 *   --out-dir <dir>                    出力ディレクトリ（デフォルト: ./output/）
 *   --dry-run                          ファイルを書き出さずレポートのみ出力
 *   --delimiter <comma|tab|auto>       区切り文字（デフォルト: auto）
 *   --encoding <utf8|sjis|auto>        文字コード（デフォルト: auto）
 */

import fs from 'fs/promises'
import path from 'path'

// ---------------------------------------------------------------------------
// CLI 引数パース
// ---------------------------------------------------------------------------

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.error(`Usage:
  npx tsx scripts/convert-makeshop-csv.ts <input-file> [options]

Options:
  --out-dir <dir>                出力ディレクトリ（デフォルト: ./output）
  --dry-run                      ファイルを書き出さずレポートのみ出力
  --delimiter <comma|tab|auto>   区切り文字（デフォルト: auto）
  --encoding <utf8|sjis|auto>    文字コード（デフォルト: auto）`)
  process.exit(1)
}

const inputFile = args.find((a) => !a.startsWith('--'))
if (!inputFile) {
  console.error('Error: input file is required.')
  process.exit(1)
}

const outDirIdx = args.indexOf('--out-dir')
const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? args[outDirIdx + 1] : './output/'
const isDryRun = args.includes('--dry-run')

const delimiterArgIdx = args.indexOf('--delimiter')
const delimiterArg =
  delimiterArgIdx !== -1 && args[delimiterArgIdx + 1] ? args[delimiterArgIdx + 1] : 'auto'

const encodingArgIdx = args.indexOf('--encoding')
const encodingArg =
  encodingArgIdx !== -1 && args[encodingArgIdx + 1] ? args[encodingArgIdx + 1] : 'auto'

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

type MakeShopRow = {
  登録日: string
  ショップID: string
  会員グループ: string
  会員ID: string
  お名前: string
  フリガナ: string
  'E-mail': string
  メールマガジン: string
  性別: string
  生年月日: string
  ポイント: string
  ショップポイント有効期限: string
  電話番号: string
  会社電話番号: string
  携帯電話番号: string
  郵便番号: string
  自宅住所: string
  会社郵便番号: string
  会社住所: string
  '携帯電話E-mail': string
  FAX: string
  その他: string
  [key: string]: string
}

type CustomerRow = {
  メールアドレス: string
  氏名: string
  フリガナ: string
  電話番号: string
  携帯電話番号: string
  性別: string
  生年月日: string
  メルマガ購読: string
  郵便番号: string
  都道府県: string
  住所1: string
  住所2: string
  デフォルト配送先住所: string
  旧登録日時: string
  'MakeShop移行ID': string
  legacyData: string
}

type PointsMigrationEntry = {
  legacyId: string
  points: number
}

type AddressParseFailure = {
  legacyId: string
  rawAddress: string
}

type GenderUnmapped = {
  legacyId: string
  rawValue: string
}

type BirthdayInvalid = {
  legacyId: string
  rawValue: string
}

type EmailMissing = {
  legacyId: string
}

type ConversionReport = {
  inputFile: string
  detectedEncoding: string
  detectedDelimiter: string
  totalRows: number
  successRows: number
  skippedRows: number
  errorRows: number
  addressParseFailures: AddressParseFailure[]
  genderUnmapped: GenderUnmapped[]
  birthdayInvalid: BirthdayInvalid[]
  emailMissing: EmailMissing[]
  pointsMigrationCount: number
  pointsMigrationTotal: number
}

// ---------------------------------------------------------------------------
// 文字コード読み込み
// ---------------------------------------------------------------------------

async function readTextFile(filePath: string, encoding: string = 'auto'): Promise<{ text: string; detectedEncoding: string }> {
  const buf = await fs.readFile(filePath)

  // UTF-8 BOM 検出
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return {
      text: new TextDecoder('utf-8').decode(buf.subarray(3)),
      detectedEncoding: 'utf8-bom',
    }
  }

  if (encoding === 'utf8') {
    return {
      text: new TextDecoder('utf-8').decode(buf),
      detectedEncoding: 'utf8',
    }
  }

  if (encoding === 'sjis') {
    try {
      return {
        text: new TextDecoder('shift-jis').decode(buf),
        detectedEncoding: 'sjis',
      }
    } catch (err) {
      throw new Error(
        `Shift_JIS デコードに失敗しました。Node.js が full-icu でビルドされていない可能性があります。
事前に 'iconv -f CP932 -t UTF-8 input.csv > input-utf8.csv' で UTF-8 に変換してから再実行してください。
詳細: ${err instanceof Error ? err.message : err}`,
      )
    }
  }

  // auto: まず UTF-8 strict を試みる
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
    return { text, detectedEncoding: 'utf8' }
  } catch {
    // UTF-8 失敗 → Shift_JIS にフォールバック
    try {
      return {
        text: new TextDecoder('shift-jis').decode(buf),
        detectedEncoding: 'sjis',
      }
    } catch (err) {
      throw new Error(
        `文字コードの自動検出に失敗しました（UTF-8 / Shift_JIS どちらも不可）。
--encoding オプションで明示するか、事前に UTF-8 へ変換してから再実行してください。
詳細: ${err instanceof Error ? err.message : err}`,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// 区切り文字自動検出
// ---------------------------------------------------------------------------

function detectDelimiter(firstLine: string): ',' | '\t' {
  const tabCount = (firstLine.match(/\t/g) ?? []).length
  const commaCount = (firstLine.match(/,/g) ?? []).length
  // タブが含まれていればタブ優先、含まれていなければコンマ
  if (tabCount > 0 && tabCount >= commaCount) {
    return '\t'
  }
  return ','
}

// ---------------------------------------------------------------------------
// 区切り文字対応パーサ（RFC 4180 引用符対応）
// ---------------------------------------------------------------------------

function parseDelimitedLine(line: string, delimiter: string): string[] {
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
      } else if (ch === delimiter) {
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

function parseDelimited(text: string, delimiter: ',' | '\t'): MakeShopRow[] {
  // Strip BOM（念のため文字列レベルでも対応）
  const cleaned = text.startsWith('\uFEFF') ? text.slice(1) : text

  const lines = cleaned.split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = parseDelimitedLine(lines[0], delimiter)
  const result: MakeShopRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue
    const values = parseDelimitedLine(line, delimiter)
    const row: MakeShopRow = {} as MakeShopRow
    headers.forEach((header, j) => {
      row[header.trim()] = (values[j] ?? '').trim()
    })
    result.push(row)
  }

  return result
}

// ---------------------------------------------------------------------------
// 文字変換ユーティリティ
// ---------------------------------------------------------------------------

/** 全角英数字・記号を半角に変換 */
function toHalfWidth(str: string): string {
  return str
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .trim()
}

/** メールアドレス正規化（小文字化 + 半角化 + trim） */
function normalizeEmail(raw: string): string {
  return toHalfWidth(raw).toLowerCase().trim()
}

/** 郵便番号正規化: 7桁数字ならハイフン挿入 */
function normalizePostalCode(raw: string): string {
  const half = toHalfWidth(raw)
  const digits = half.replace(/[^0-9]/g, '')
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`
  }
  return half
}

/** 電話番号正規化（半角化、ハイフン維持） */
function normalizePhone(raw: string): string {
  return toHalfWidth(raw)
}

// ---------------------------------------------------------------------------
// 日付変換ユーティリティ
// ---------------------------------------------------------------------------

/**
 * MakeShop 日付（YYYY/MM/DD）→ ISO 8601 date（YYYY-MM-DD）
 * 空欄・"//": null を返す
 */
function parseMakeShopDate(raw: string): string | null {
  if (!raw || raw === '//' || raw.trim() === '') return null
  // YYYY/MM/DD or YYYY-MM-DD
  const m = raw.trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  const month = mo.padStart(2, '0')
  const day = d.padStart(2, '0')
  return `${y}-${month}-${day}`
}

// ---------------------------------------------------------------------------
// 性別変換
// ---------------------------------------------------------------------------

function normalizeGender(raw: string): { value: 'male' | 'female' | 'unspecified'; unmapped: boolean } {
  if (raw === '男') return { value: 'male', unmapped: false }
  if (raw === '女') return { value: 'female', unmapped: false }
  if (!raw || raw === '') return { value: 'unspecified', unmapped: false }
  return { value: 'unspecified', unmapped: true }
}

// ---------------------------------------------------------------------------
// メルマガ変換
// ---------------------------------------------------------------------------

function normalizeNewsletter(raw: string): boolean {
  return raw === 'Y'
}

// ---------------------------------------------------------------------------
// 住所分離
// ---------------------------------------------------------------------------

const PREFECTURE_REGEX =
  /^(東京都|北海道|(?:京都|大阪)府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県)\s*/

/**
 * MakeShop 固有の都道府県表記を標準形式に正規化する。
 * 「東京(23区内)」「東京(23区外)」は PREFECTURE_REGEX にマッチしないため、
 * 事前に「東京都」に置換する。23区内/外 の情報は defaultAddress と
 * legacyData.rawAddress に原文として保持されるので失われない。
 */
function normalizeMakeshopAddress(raw: string): string {
  return raw
    .replace(/^東京\(23区内\)\s*/, '東京都 ')
    .replace(/^東京\(23区外\)\s*/, '東京都 ')
}

type AddressParseResult = {
  prefecture: string
  addressLine1: string
  addressLine2: string
  defaultAddress: string
  parseStatus: 'ok' | 'failed'
}

function parseAddress(raw: string): AddressParseResult {
  if (!raw || raw.trim() === '') {
    return {
      prefecture: '',
      addressLine1: '',
      addressLine2: '',
      defaultAddress: '',
      parseStatus: 'ok',
    }
  }

  const trimmed = raw.trim()
  // 原文は defaultAddress / legacyData.rawAddress として保持するため、
  // parseAddress のマッチ用にだけ MakeShop 固有表記を標準化する
  const normalized = normalizeMakeshopAddress(trimmed)
  const m = normalized.match(PREFECTURE_REGEX)
  if (m) {
    const prefecture = m[1]
    const rest = normalized.slice(m[0].length).trim()
    return {
      prefecture,
      addressLine1: rest,
      addressLine2: '',
      defaultAddress: trimmed, // 原文を保持
      parseStatus: 'ok',
    }
  }

  return {
    prefecture: '',
    addressLine1: '',
    addressLine2: '',
    defaultAddress: trimmed,
    parseStatus: 'failed',
  }
}

// ---------------------------------------------------------------------------
// CSV エスケープ（RFC 4180）
// ---------------------------------------------------------------------------

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""'
  const s = String(val).replace(/"/g, '""')
  return `"${s}"`
}

// ---------------------------------------------------------------------------
// メイン変換処理
// ---------------------------------------------------------------------------

async function main() {
  // 実行時刻（UTC）
  const now = new Date()
  const importedAt = now.toISOString()
  const dateSuffix = importedAt.slice(0, 10) // YYYY-MM-DD

  // 入力ファイル読み込み（文字コード自動検出）
  const resolvedInput = path.resolve(inputFile!)
  let rawText: string
  let detectedEncoding: string
  try {
    const result = await readTextFile(resolvedInput, encodingArg)
    rawText = result.text
    detectedEncoding = result.detectedEncoding
  } catch (err) {
    console.error(`Error: Cannot read input file "${resolvedInput}"`)
    if (err instanceof Error) console.error(err.message)
    process.exit(1)
  }

  console.log(`Encoding: ${detectedEncoding}`)

  // 区切り文字検出
  const firstLine = rawText.split(/\r?\n/)[0] ?? ''
  let delimiter: ',' | '\t'
  let detectedDelimiter: string
  if (delimiterArg === 'tab') {
    delimiter = '\t'
    detectedDelimiter = 'tab'
  } else if (delimiterArg === 'comma') {
    delimiter = ','
    detectedDelimiter = 'comma'
  } else {
    // auto
    delimiter = detectDelimiter(firstLine)
    detectedDelimiter = delimiter === '\t' ? 'tab' : 'comma'
  }

  console.log(`Delimiter: ${detectedDelimiter}`)

  // パース
  const rows = parseDelimited(rawText, delimiter)
  console.log(`Parsed ${rows.length} rows from ${resolvedInput}`)

  // 出力ディレクトリ作成
  const resolvedOutDir = path.resolve(outDir)
  await fs.mkdir(resolvedOutDir, { recursive: true })

  // レポート初期化
  const report: ConversionReport = {
    inputFile: resolvedInput,
    detectedEncoding,
    detectedDelimiter,
    totalRows: rows.length,
    successRows: 0,
    skippedRows: 0,
    errorRows: 0,
    addressParseFailures: [],
    genderUnmapped: [],
    birthdayInvalid: [],
    emailMissing: [],
    pointsMigrationCount: 0,
    pointsMigrationTotal: 0,
  }

  const customerRows: CustomerRow[] = []
  const pointsEntries: PointsMigrationEntry[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const legacyId = row['会員ID']?.trim() ?? ''

    // 会員ID が空欄なら skip
    if (!legacyId) {
      report.skippedRows++
      continue
    }

    // メールアドレス検証
    const rawEmail = row['E-mail'] ?? ''
    const email = normalizeEmail(rawEmail)
    if (!email || !email.includes('@')) {
      report.emailMissing.push({ legacyId })
      report.skippedRows++
      continue
    }

    // --- 各フィールド変換 ---

    // 登録日
    const rawRegisteredAt = row['登録日'] ?? ''
    const legacyRegisteredAt = parseMakeShopDate(rawRegisteredAt) ?? ''

    // 氏名
    const name = (row['お名前'] ?? '').trim()

    // フリガナ
    const nameKana = (row['フリガナ'] ?? '').trim()

    // 電話番号
    const phone = normalizePhone(row['電話番号'] ?? '')

    // 携帯電話番号
    const mobilePhone = normalizePhone(row['携帯電話番号'] ?? '')

    // 性別
    const rawGender = (row['性別'] ?? '').trim()
    const genderResult = normalizeGender(rawGender)
    if (genderResult.unmapped) {
      report.genderUnmapped.push({ legacyId, rawValue: rawGender })
    }
    const genderLabel =
      genderResult.value === 'male' ? '男性' : genderResult.value === 'female' ? '女性' : '未設定'

    // 生年月日
    const rawBirthday = (row['生年月日'] ?? '').trim()
    const birthdayParsed = parseMakeShopDate(rawBirthday)
    if (rawBirthday && rawBirthday !== '//' && birthdayParsed === null) {
      report.birthdayInvalid.push({ legacyId, rawValue: rawBirthday })
    }
    const birthday = birthdayParsed ?? ''

    // メルマガ
    const newsletterSubscribed = normalizeNewsletter(row['メールマガジン'] ?? '')

    // 郵便番号
    const postalCode = normalizePostalCode(row['郵便番号'] ?? '')

    // 住所分離
    const rawAddress = (row['自宅住所'] ?? '').trim()
    const addressResult = parseAddress(rawAddress)
    if (addressResult.parseStatus === 'failed' && rawAddress) {
      report.addressParseFailures.push({ legacyId, rawAddress })
    }

    // ポイント（CSV には含めず JSON に分離）
    const rawPoints = (row['ポイント'] ?? '').trim()
    const points = parseInt(rawPoints, 10) || 0
    if (points > 0) {
      pointsEntries.push({ legacyId, points })
      report.pointsMigrationCount++
      report.pointsMigrationTotal += points
    }

    // legacyData JSON 構築
    const legacyDataObj = {
      source: 'makeshop',
      importedAt,
      requirePasswordChange: true,
      shopId: row['ショップID'] ?? '',
      memberId: legacyId,
      registeredAt: rawRegisteredAt,
      companyPhone: row['会社電話番号'] ?? '',
      companyPostalCode: row['会社郵便番号'] ?? '',
      companyAddress: row['会社住所'] ?? '',
      mobileEmail: row['携帯電話E-mail'] ?? '',
      fax: row['FAX'] ?? '',
      pointsExpireAt: row['ショップポイント有効期限'] ?? '',
      memberGroup: row['会員グループ'] ?? '',
      other: row['その他'] ?? '',
      rawAddress: rawAddress || undefined,
      addressParseStatus: rawAddress ? addressResult.parseStatus : 'ok',
    }

    // rawAddress が空なら undefined（JSON から除外）
    if (!rawAddress) {
      delete legacyDataObj.rawAddress
    }

    const legacyDataJson = JSON.stringify(legacyDataObj)

    // CustomerRow 組み立て
    const customerRow: CustomerRow = {
      メールアドレス: email,
      氏名: name,
      フリガナ: nameKana,
      電話番号: phone,
      携帯電話番号: mobilePhone,
      性別: genderLabel,
      生年月日: birthday,
      メルマガ購読: newsletterSubscribed ? 'TRUE' : 'FALSE',
      郵便番号: postalCode,
      都道府県: addressResult.prefecture,
      住所1: addressResult.addressLine1,
      住所2: addressResult.addressLine2,
      デフォルト配送先住所: addressResult.defaultAddress,
      旧登録日時: legacyRegisteredAt,
      'MakeShop移行ID': legacyId,
      legacyData: legacyDataJson,
    }

    customerRows.push(customerRow)
    report.successRows++
  }

  // ---------------------------------------------------------------------------
  // 出力ファイル生成
  // ---------------------------------------------------------------------------

  const BOM = '\uFEFF'

  // Output 1: customers_import_YYYY-MM-DD.csv
  if (!isDryRun) {
    const csvColumns = [
      'メールアドレス',
      '氏名',
      'フリガナ',
      '電話番号',
      '携帯電話番号',
      '性別',
      '生年月日',
      'メルマガ購読',
      '郵便番号',
      '都道府県',
      '住所1',
      '住所2',
      'デフォルト配送先住所',
      '旧登録日時',
      'MakeShop移行ID',
      'legacyData',
    ] as const

    const header = csvColumns.map((col) => escapeCsvField(col)).join(',')
    const dataRows = customerRows.map((row) =>
      csvColumns.map((col) => escapeCsvField(row[col as keyof CustomerRow])).join(','),
    )
    const csvContent = BOM + [header, ...dataRows].join('\n')

    const customersFile = path.join(resolvedOutDir, `customers_import_${dateSuffix}.csv`)
    await fs.writeFile(customersFile, csvContent, 'utf-8')
    console.log(`Written: ${customersFile} (${customerRows.length} rows)`)
  } else {
    console.log(`[DRY RUN] Would write customers_import_${dateSuffix}.csv (${customerRows.length} rows)`)
  }

  // Output 2: points_migration_YYYY-MM-DD.json
  if (!isDryRun) {
    const pointsFile = path.join(resolvedOutDir, `points_migration_${dateSuffix}.json`)
    await fs.writeFile(pointsFile, JSON.stringify(pointsEntries, null, 2), 'utf-8')
    console.log(`Written: ${pointsFile} (${pointsEntries.length} entries)`)
  } else {
    console.log(
      `[DRY RUN] Would write points_migration_${dateSuffix}.json (${pointsEntries.length} entries, total: ${report.pointsMigrationTotal} pts)`,
    )
  }

  // Output 3: conversion_report_YYYY-MM-DD.json（dry-run でも書き出し可）
  const reportFile = path.join(resolvedOutDir, `conversion_report_${dateSuffix}.json`)
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`Written: ${reportFile}`)

  // コンソールサマリ
  console.log('\n=== Conversion Summary ===')
  console.log(`  Input file       : ${resolvedInput}`)
  console.log(`  Encoding         : ${detectedEncoding}`)
  console.log(`  Delimiter        : ${detectedDelimiter}`)
  console.log(`  Total rows       : ${report.totalRows}`)
  console.log(`  Success rows     : ${report.successRows}`)
  console.log(`  Skipped rows     : ${report.skippedRows}`)
  console.log(`  Error rows       : ${report.errorRows}`)
  console.log(`  Points entries   : ${report.pointsMigrationCount} (total: ${report.pointsMigrationTotal} pts)`)
  if (report.addressParseFailures.length > 0)
    console.log(`  Address failures : ${report.addressParseFailures.length}`)
  if (report.genderUnmapped.length > 0)
    console.log(`  Gender unmapped  : ${report.genderUnmapped.length}`)
  if (report.birthdayInvalid.length > 0)
    console.log(`  Birthday invalid : ${report.birthdayInvalid.length}`)
  if (report.emailMissing.length > 0)
    console.log(`  Email missing    : ${report.emailMissing.length}`)
  if (isDryRun) console.log('\n  [DRY RUN] customers CSV and points JSON were NOT written.')
  console.log('==========================\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
