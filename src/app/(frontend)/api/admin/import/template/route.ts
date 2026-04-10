import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { toCsvTemplate } from '@/lib/csv-utils'

const TEMPLATES = {
  products: [
    { key: 'title', label: '商品名' },
    { key: 'slug', label: 'スラッグ' },
    { key: 'sku', label: 'SKU' },
    { key: 'price', label: '価格（円）' },
    { key: 'productType', label: '商品種別' },
    { key: 'stock', label: '在庫数' },
    { key: 'status', label: 'ステータス' },
    { key: 'tags', label: 'タグ' },
  ],
  customers: [
    { key: 'email', label: 'メールアドレス' },
    { key: 'name', label: '氏名' },
    { key: 'phone', label: '電話番号' },
    { key: 'defaultAddress', label: 'デフォルト住所' },
    { key: 'points', label: '保有ポイント' },
    { key: 'legacyId', label: 'MakeShop移行ID' },
  ],
} as const

type TemplateType = keyof typeof TEMPLATES

export async function GET(request: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || (user as { role?: string }).role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') as TemplateType | null

  if (!type || !TEMPLATES[type]) {
    return Response.json(
      { error: `typeパラメータが無効です。使用可能な値: ${Object.keys(TEMPLATES).join(', ')}` },
      { status: 400 },
    )
  }

  const csv = toCsvTemplate(TEMPLATES[type] as unknown as { key: string; label: string }[])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}_template.csv"`,
    },
  })
}
