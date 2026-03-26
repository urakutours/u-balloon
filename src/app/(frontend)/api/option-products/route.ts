import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const exclude = searchParams.get('exclude') || ''

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'products',
    where: {
      status: { equals: 'published' },
      tags: { contains: 'オプション' },
      ...(exclude ? { id: { not_equals: exclude } } : {}),
    },
    limit: 12,
    sort: '-createdAt',
  })

  const products = result.docs.map((p) => ({
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
