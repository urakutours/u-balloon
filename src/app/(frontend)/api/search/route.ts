import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() || ''

  if (!q) {
    return NextResponse.json({ products: [] })
  }

  const payload = await getPayload({ config })

  // Search by title first (like operator works on text fields)
  const titleResult = await payload.find({
    collection: 'products',
    where: {
      status: { equals: 'published' },
      title: { like: q },
    },
    limit: 8,
    sort: '-createdAt',
  })

  // If not enough results from title, also search by tags (JSON field)
  let allDocs = titleResult.docs
  if (allDocs.length < 8) {
    const allProducts = await payload.find({
      collection: 'products',
      where: {
        status: { equals: 'published' },
      },
      limit: 100,
      sort: '-createdAt',
    })
    const titleIds = new Set(allDocs.map((d) => d.id))
    const tagMatches = allProducts.docs.filter((p) => {
      if (titleIds.has(p.id)) return false
      const tags = parseTags(p.tags)
      return tags.some((t) => t.includes(q))
    })
    allDocs = [...allDocs, ...tagMatches].slice(0, 8)
  }

  const result = { docs: allDocs }

  const products = result.docs.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: p.price,
    imageUrl: getImageUrl(p.images),
    tags: parseTags(p.tags),
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

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string')
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags)
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string')
    } catch {
      // not JSON, return empty
    }
  }
  return []
}
