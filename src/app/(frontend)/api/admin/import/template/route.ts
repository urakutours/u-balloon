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
    { key: 'legacyData', label: 'legacyData' },
  ],
} as const

// Sample rows for customers template (dummy data, 2 rows)
const CUSTOMERS_SAMPLE_ROWS = [
  [
    'sample1@example.com',
    '山田 太郎',
    'ヤマダ タロウ',
    '099-123-4567',
    '090-1234-5678',
    '男性',
    '1980-04-15',
    'TRUE',
    '880-0861',
    '宮崎県',
    '宮崎市出来島町181番地1',
    'サンプルマンション101',
    '宮崎県宮崎市出来島町181番地1 サンプルマンション101',
    '2015-06-01',
    'MS00001',
    '',
  ],
  [
    'sample2@example.com',
    '鈴木 花子',
    'スズキ ハナコ',
    '03-1234-5678',
    '',
    '女性',
    '1990-11-23',
    'FALSE',
    '150-0001',
    '東京都',
    '渋谷区神宮前1丁目1番1号',
    '',
    '東京都渋谷区神宮前1丁目1番1号',
    '2018-03-10',
    'MS00002',
    '',
  ],
]

type TemplateType = keyof typeof TEMPLATES

function escapeCsvField(val: string): string {
  const s = val.replace(/"/g, '""')
  return `"${s}"`
}

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

  let csv: string

  if (type === 'customers') {
    // Customers template: header + 2 sample rows, BOM-prefixed UTF-8
    const BOM = '\uFEFF'
    const cols = TEMPLATES.customers
    const header = cols.map(c => escapeCsvField(c.label)).join(',')
    const sampleLines = CUSTOMERS_SAMPLE_ROWS.map(row =>
      row.map(cell => escapeCsvField(cell)).join(','),
    )
    csv = BOM + [header, ...sampleLines].join('\n') + '\n'
  } else {
    csv = toCsvTemplate(TEMPLATES[type] as unknown as { key: string; label: string }[])
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}_template.csv"`,
    },
  })
}
