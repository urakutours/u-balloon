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
    電話番号: u.phone ?? '',
    デフォルト住所: u.defaultAddress ?? '',
    保有ポイント: u.points ?? 0,
    MakeShop移行ID: u.legacyId ?? '',
    登録日時: u.createdAt
      ? new Date(u.createdAt as string).toLocaleString('ja-JP')
      : '',
  }))

  const columns = [
    { key: '顧客ID', label: '顧客ID' },
    { key: 'メールアドレス', label: 'メールアドレス' },
    { key: '氏名', label: '氏名' },
    { key: '電話番号', label: '電話番号' },
    { key: 'デフォルト住所', label: 'デフォルト住所' },
    { key: '保有ポイント', label: '保有ポイント' },
    { key: 'MakeShop移行ID', label: 'MakeShop移行ID' },
    { key: '登録日時', label: '登録日時' },
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
