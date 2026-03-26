import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const PAGE_SIZE = 20

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const tag = searchParams.get('tag') || null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const sort = searchParams.get('sort') || 'recommended'

  const payload = await getPayload({ config })

  // Fetch all published products (tags is JSON, can't filter via SQL)
  const allProducts = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    limit: 500,
    sort: '-createdAt',
  })

  const allSerialized = allProducts.docs.map((p) => ({
    id: p.id as string,
    title: p.title as string,
    slug: p.slug as string,
    price: p.price as number,
    productType: p.productType as 'standard' | 'delivery',
    tags: (p.tags as string[] | undefined) || [],
    imageUrl: getImageUrl(p.images),
    sku: (p.sku as string) || undefined,
    popularityScore: (p.popularityScore as number) || 0,
  }))

  // Filter by tag in-memory
  const filtered = tag
    ? allSerialized.filter((p) => p.tags.includes(tag))
    : allSerialized

  // Sort
  if (sort === 'recommended') {
    // Popularity score descending, then newest first as tiebreaker (already sorted by -createdAt)
    filtered.sort((a, b) => b.popularityScore - a.popularityScore)
  } else if (sort === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price)
  } else if (sort === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price)
  }
  // 'newest' keeps the original -createdAt order

  const totalDocs = filtered.length
  const totalPages = Math.ceil(totalDocs / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const pageProducts = filtered.slice(start, start + PAGE_SIZE)

  return NextResponse.json({
    products: pageProducts,
    totalDocs,
    totalPages,
    page,
    hasNextPage: page < totalPages,
  })
}

function getImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null
  const first = images[0]
  if (first?.image && typeof first.image === 'object' && 'url' in first.image) {
    return first.image.url as string
  }
  return null
}
