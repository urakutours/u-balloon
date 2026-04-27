import { NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseCsv } from '@/lib/csv-utils'

type ImportResult = {
  total: number
  created: number
  updated: number
  /**
   * Rows intentionally skipped without error (reserved for future soft-skip cases).
   * Failed rows are tracked in `errors` only.
   * Invariant: total === created + updated + skipped + errors.length
   */
  skipped: number
  errors: Array<{ row: number; message: string }>
}

function generateTempPassword(): string {
  // Cryptographically secure 32-char hex password for newly created accounts.
  // The user will need to reset this via "forgot password" since the password
  // is never exposed (legacyData.requirePasswordChange forces a reset on first login).
  return randomBytes(16).toString('hex')
}

// Valid prefecture values from Users.ts select options
const VALID_PREFECTURES = new Set([
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
])

/** Normalize gender: CSV outputs 男性/女性/未設定 labels; also accept male/female/男/女 */
function parseGender(raw: string): 'male' | 'female' | 'unspecified' {
  const v = (raw || '').trim()
  if (v === '男性' || v === '男' || v === 'male' || v === 'Male') return 'male'
  if (v === '女性' || v === '女' || v === 'female' || v === 'Female') return 'female'
  return 'unspecified'
}

/** Parse birthday: YYYY/MM/DD or YYYY-MM-DD → ISO date string; invalid → null */
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

/** Parse legacyRegisteredAt: YYYY/MM/DD, YYYY-MM-DD, or ISO string → ISO date; invalid → null */
function parseLegacyDate(raw: string): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  // Try date-only pattern first
  const m = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (m) {
    const [, y, mo, d] = m
    const date = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`)
    if (!isNaN(date.getTime())) return date.toISOString()
    return null
  }
  // Try full ISO string
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) return date.toISOString()
  return null
}

/** Parse newsletterSubscribed: TRUE/true/Y/1/はい → true, others → false */
function parseNewsletter(raw: string): boolean {
  const v = (raw || '').trim().toLowerCase()
  return v === 'true' || v === 'y' || v === '1' || v === 'はい'
}

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return Response.json({ error: 'ファイルが選択されていません' }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCsv(text)

  if (rows.length === 0) {
    return Response.json({ error: 'データが空です（ヘッダー行のみ、またはファイルが空です）' }, { status: 400 })
  }

  const result: ImportResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  const importedAt = new Date().toISOString()

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2

    try {
      // Password column is intentionally ignored for security
      const email = (row['メールアドレス'] || '').trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.errors.push({ row: rowNum, message: `メールアドレスが無効です: "${email}"` })
        continue
      }

      // --- Parse new fields ---

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

      // Parse legacyData JSON from CSV column (may be absent)
      let parsedLegacyData: Record<string, unknown> = {}
      const legacyDataRaw = (row['legacyData'] || '').trim()
      if (legacyDataRaw) {
        try {
          const parsed = JSON.parse(legacyDataRaw)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            parsedLegacyData = parsed as Record<string, unknown>
          }
        } catch {
          // parse failure: ignore, keep empty object
        }
      }

      // legacyId from CSV
      const legacyId = (row['MakeShop移行ID'] || '').trim() || undefined

      // Build base customerData (no points — points are imported via migrate-points separately)
      const customerData: Record<string, unknown> = {
        name: (row['氏名'] || '').trim() || undefined,
        phone: (row['電話番号'] || '').trim() || undefined,
        defaultAddress: (row['デフォルト配送先住所'] || '').trim() || undefined,
        role: 'customer', // always force customer role
      }

      if (legacyId) customerData.legacyId = legacyId
      if (nameKana) customerData.nameKana = nameKana
      if (mobilePhone) customerData.mobilePhone = mobilePhone
      customerData.gender = gender  // always set (has default 'unspecified')
      if (birthday) customerData.birthday = birthday
      customerData.newsletterSubscribed = newsletterSubscribed  // always set (boolean)
      if (postalCode) customerData.postalCode = postalCode
      if (prefecture) customerData.prefecture = prefecture
      if (addressLine1) customerData.addressLine1 = addressLine1
      if (addressLine2) customerData.addressLine2 = addressLine2
      if (legacyRegisteredAt) customerData.legacyRegisteredAt = legacyRegisteredAt

      // Remove undefined values to avoid overwriting existing data with null
      for (const key of Object.keys(customerData)) {
        if (customerData[key] === undefined || customerData[key] === '') {
          delete customerData[key]
        }
      }

      // --- Lookup existing user: legacyId first, then email ---
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
        // Do not modify admin accounts
        if ((existingUser as { role?: string }).role === 'admin') {
          result.errors.push({ row: rowNum, message: `管理者アカウント (${email}) はインポートで変更できません` })
          continue
        }

        // If email differs from CSV email, check uniqueness before overwriting
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
            result.errors.push({
              row: rowNum,
              message: `メールアドレス "${email}" は他のユーザーが使用中のため更新できません (legacyId: ${legacyId})`,
            })
            continue
          }
          customerData.email = email
        }

        // Merge legacyData: existing data + CSV data (CSV keys overwrite, existing-only keys are kept)
        const existingLegacyData =
          existingUser.legacyData && typeof existingUser.legacyData === 'object'
            ? (existingUser.legacyData as Record<string, unknown>)
            : {}
        const mergedLegacyData = { ...existingLegacyData, ...parsedLegacyData }
        customerData.legacyData = mergedLegacyData

        await payload.update({
          collection: 'users',
          id: existingUser.id,
          data: customerData as Parameters<typeof payload.update>[0]['data'],
          depth: 0,
          context: {
            skipWelcomeEmail: true,
            skipPointAdjustHook: true,
            // MakeShop 移行: ガラケー時代の RFC 違反 email (連続ドット
            // `..`、末尾ドット `.@`) を受け入れる。Users.email validate
            // が context flag を見て loose regex に切り替える。
            allowLegacyEmailFormat: true,
          },
        })
        result.updated++
      } else {
        // New user: build legacyData with requirePasswordChange: true
        const newLegacyData: Record<string, unknown> = {
          ...parsedLegacyData,
          source: parsedLegacyData.source ?? 'makeshop',
          importedAt,
          requirePasswordChange: true,
        }
        customerData.legacyData = newLegacyData

        await payload.create({
          collection: 'users',
          data: {
            email,
            password: generateTempPassword(),
            ...customerData,
          } as Parameters<typeof payload.create>[0]['data'],
          depth: 0,
          context: {
            skipWelcomeEmail: true,
            // MakeShop 移行: 同上 (Users.email validate が緩和される)
            allowLegacyEmailFormat: true,
          },
        })
        result.created++
      }
    } catch (err) {
      result.errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : '不明なエラー',
      })
    }
  }

  return Response.json(result)
}
