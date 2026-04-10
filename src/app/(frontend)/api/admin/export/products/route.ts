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

  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 10000,
    sort: '-createdAt',
  })

  if (format === 'json') {
    return Response.json(result.docs)
  }

  const rows = result.docs.map(product => {
    // Extract first image URL if available
    const images = product.images as Array<Record<string, unknown>> | null
    const firstImage = images?.[0]
    const imageUrl =
      (firstImage?.url as string) ||
      ((firstImage?.image as Record<string, unknown>)?.url as string) ||
      ''

    // tags is json field
    let tagsStr = ''
    if (product.tags) {
      tagsStr = Array.isArray(product.tags)
        ? (product.tags as string[]).join(', ')
        : JSON.stringify(product.tags)
    }

    return {
      商品名: product.title ?? '',
      スラッグ: product.slug ?? '',
      SKU: product.sku ?? '',
      価格: product.price ?? '',
      商品種別: product.productType === 'delivery' ? 'デリバリー' : '通常',
      在庫数: product.stock ?? '',
      ステータス: product.status === 'published' ? '公開' : '下書き',
      タグ: tagsStr,
      画像URL: imageUrl,
      作成日時: product.createdAt
        ? new Date(product.createdAt as string).toLocaleString('ja-JP')
        : '',
      更新日時: product.updatedAt
        ? new Date(product.updatedAt as string).toLocaleString('ja-JP')
        : '',
    }
  })

  const columns = [
    { key: '商品名', label: '商品名' },
    { key: 'スラッグ', label: 'スラッグ' },
    { key: 'SKU', label: 'SKU' },
    { key: '価格', label: '価格（円）' },
    { key: '商品種別', label: '商品種別' },
    { key: '在庫数', label: '在庫数' },
    { key: 'ステータス', label: 'ステータス' },
    { key: 'タグ', label: 'タグ' },
    { key: '画像URL', label: '画像URL' },
    { key: '作成日時', label: '作成日時' },
    { key: '更新日時', label: '更新日時' },
  ]

  const csv = toCsv(rows, columns)
  const filename = `products_${new Date().toISOString().slice(0, 10)}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
