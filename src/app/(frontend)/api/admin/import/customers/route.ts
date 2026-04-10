import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseCsv } from '@/lib/csv-utils'

type ImportResult = {
  total: number
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

function generateTempPassword(): string {
  // Random 16-char password for newly created accounts
  // The user will need to reset this via "forgot password"
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase()
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

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2

    try {
      // Password column is intentionally ignored for security
      const email = (row['メールアドレス'] || '').trim().toLowerCase()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        result.errors.push({ row: rowNum, message: `メールアドレスが無効です: "${email}"` })
        result.skipped++
        continue
      }

      const points = parseInt(row['保有ポイント'] || '0', 10)

      const customerData: Record<string, unknown> = {
        name: row['氏名'] || '',
        phone: row['電話番号'] || '',
        defaultAddress: row['デフォルト住所'] || '',
        legacyId: row['MakeShop移行ID'] || undefined,
        role: 'customer', // always force customer role
        points: isNaN(points) ? 0 : points,
      }
      // Remove empty optional fields
      if (!customerData.legacyId) delete customerData.legacyId

      // Check for existing user by email
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
      })

      if (found.docs.length > 0) {
        const existingUser = found.docs[0]
        // Do not downgrade admin accounts
        if ((existingUser as { role?: string }).role === 'admin') {
          result.errors.push({ row: rowNum, message: `管理者アカウント (${email}) はインポートで変更できません` })
          result.skipped++
          continue
        }
        await payload.update({
          collection: 'users',
          id: existingUser.id,
          data: customerData as Parameters<typeof payload.update>[0]['data'],
          depth: 0,
        })
        result.updated++
      } else {
        await payload.create({
          collection: 'users',
          data: {
            email,
            password: generateTempPassword(),
            ...customerData,
          } as Parameters<typeof payload.create>[0]['data'],
          depth: 0,
        })
        result.created++
      }
    } catch (err) {
      result.errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : '不明なエラー',
      })
      result.skipped++
    }
  }

  return Response.json(result)
}
