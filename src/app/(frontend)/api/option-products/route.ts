import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exclude = searchParams.get('exclude') || ''

  const payload = await getPayload({ config })

  // tags は jsonb 列なので drizzle の `contains` (= ILIKE) は実行時 500 になる。
  // where から外し、アプリ層で配列フィルタする (商品総数 ~451 件のため overfetch 許容)。
  const result = await payload.find({
    collection: 'products',
    where: {
      status: { equals: 'published' },
      ...(exclude ? { id: { not_equals: exclude } } : {}),
    },
    limit: 100,
    sort: '-createdAt',
  })

  const products = result.docs
    .filter((p) => Array.isArray(p.tags) && (p.tags as unknown[]).includes('オプション'))
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: p.price,
      imageUrl: getImageUrl(p.images),
    }))

  return NextResponse.json({ products })
}

function getImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null
  const first = images[0]
  if (first?.image && typeof first.image === 'object' && 'url' in first.image) {
    return first.image.url as string
  }
  return null
}
