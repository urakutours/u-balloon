import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toCsv } from '@/lib/csv-utils'

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const format = searchParams.get('format') || 'csv'

  // Customers only (exclude admins) — never include password hashes
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 10000,
    where: { role: { equals: 'customer' } },
    sort: '-createdAt',
  })

  if (format === 'json') {
    // Strip sensitive fields from JSON export too
    const safe = result.docs.map(({ hash: _hash, salt: _salt, password: _pw, ...rest }) => rest)
    return Response.json(safe)
  }

  const rows = result.docs.map(u => ({
    顧客ID: u.id,
    メールアドレス: u.email,
    氏名: u.name ?? '',
    フリガナ: (u.nameKana as string | undefined) ?? '',
    電話番号: u.phone ?? '',
    携帯電話番号: (u.mobilePhone as string | undefined) ?? '',
    性別: (() => {
      const g = u.gender as string | undefined
      if (g === 'male') return '男性'
      if (g === 'female') return '女性'
      return '未設定'
    })(),
    生年月日: u.birthday
      ? new Date(u.birthday as string).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
      : '',
    メルマガ購読: (u.newsletterSubscribed as boolean | undefined) ? 'TRUE' : 'FALSE',
    郵便番号: (u.postalCode as string | undefined) ?? '',
    都道府県: (u.prefecture as string | undefined) ?? '',
    '住所1': (u.addressLine1 as string | undefined) ?? '',
    '住所2': (u.addressLine2 as string | undefined) ?? '',
    デフォルト配送先住所: u.defaultAddress ?? '',
    旧登録日時: u.legacyRegisteredAt
      ? new Date(u.legacyRegisteredAt as string).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
      : '',
    'MakeShop移行ID': u.legacyId ?? '',
    保有ポイント: u.points ?? 0,
    作成日時: u.createdAt
      ? new Date(u.createdAt as string).toLocaleString('ja-JP')
      : '',
  }))

  const columns = [
    { key: '顧客ID', label: '顧客ID' },
    { key: 'メールアドレス', label: 'メールアドレス' },
    { key: '氏名', label: '氏名' },
    { key: 'フリガナ', label: 'フリガナ' },
    { key: '電話番号', label: '電話番号' },
    { key: '携帯電話番号', label: '携帯電話番号' },
    { key: '性別', label: '性別' },
    { key: '生年月日', label: '生年月日' },
    { key: 'メルマガ購読', label: 'メルマガ購読' },
    { key: '郵便番号', label: '郵便番号' },
    { key: '都道府県', label: '都道府県' },
    { key: '住所1', label: '住所1' },
    { key: '住所2', label: '住所2' },
    { key: 'デフォルト配送先住所', label: 'デフォルト配送先住所' },
    { key: '旧登録日時', label: '旧登録日時' },
    { key: 'MakeShop移行ID', label: 'MakeShop移行ID' },
    { key: '保有ポイント', label: '保有ポイント' },
    { key: '作成日時', label: '作成日時' },
  ]

  const csv = toCsv(rows, columns)
  const filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
