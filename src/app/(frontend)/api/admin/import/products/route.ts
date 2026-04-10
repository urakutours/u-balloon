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

function mapRowToProduct(row: Record<string, string>) {
  const data: Record<string, unknown> = {}

  if (row['商品名']) data.title = row['商品名']
  if (row['スラッグ']) data.slug = row['スラッグ']
  if (row['SKU']) data.sku = row['SKU']

  const price = parseFloat(row['価格'] || row['価格（円）'] || '')
  if (!isNaN(price)) data.price = price

  const stock = parseInt(row['在庫数'] || '', 10)
  if (!isNaN(stock)) data.stock = stock

  // 商品種別 mapping
  const typeRaw = row['商品種別'] || ''
  if (typeRaw === 'デリバリー' || typeRaw === 'delivery') data.productType = 'delivery'
  else if (typeRaw === '通常' || typeRaw === 'standard') data.productType = 'standard'

  // ステータス mapping
  const statusRaw = row['ステータス'] || ''
  if (statusRaw === '公開' || statusRaw === 'published') data.status = 'published'
  else if (statusRaw === '下書き' || statusRaw === 'draft') data.status = 'draft'

  // タグ (comma-separated or JSON)
  const tagsRaw = row['タグ'] || ''
  if (tagsRaw) {
    try {
      data.tags = JSON.parse(tagsRaw)
    } catch {
      data.tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    }
  }

  return data
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
    const rowNum = index + 2 // 1-indexed + header row

    try {
      const slug = row['スラッグ'] || row['スラッグ（ slug ）'] || ''
      const sku = row['SKU'] || ''
      const title = row['商品名'] || ''

      if (!title) {
        result.errors.push({ row: rowNum, message: '商品名が空です（必須項目）' })
        result.skipped++
        continue
      }

      const productData = mapRowToProduct(row)

      // Determine identifier for duplicate check (slug > sku > title)
      let existing = null
      if (slug) {
        const found = await payload.find({
          collection: 'products',
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 0,
        })
        if (found.docs.length > 0) existing = found.docs[0]
      } else if (sku) {
        const found = await payload.find({
          collection: 'products',
          where: { sku: { equals: sku } },
          limit: 1,
          depth: 0,
        })
        if (found.docs.length > 0) existing = found.docs[0]
      }

      if (existing) {
        await payload.update({
          collection: 'products',
          id: existing.id,
          data: productData,
          depth: 0,
        })
        result.updated++
      } else {
        // Require title for new products
        await payload.create({
          collection: 'products',
          data: { ...productData, title: title } as Parameters<typeof payload.create>[0]['data'],
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
