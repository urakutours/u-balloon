import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    // NEXT_PUBLIC_APP_URL must be set per-instance. No shop-specific fallback.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

    const products = await payload.find({
      collection: 'products',
      where: { status: { equals: 'published' } },
      limit: 10000,
      depth: 1,
    })

    const items = products.docs.map((product: any) => {
      const imageUrl = product.images?.[0]?.image?.url || ''
      const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${appUrl}${imageUrl}`
      const availability = product.stock == null || product.stock > 0
        ? 'in_stock'
        : 'out_of_stock'

      return [
        product.id,
        product.title,
        (product.bodyHtml || product.title || '').replace(/<[^>]*>/g, '').substring(0, 5000),
        `${appUrl}/products/${product.slug}`,
        fullImageUrl,
        availability,
        `${product.price} JPY`,
        product.sku || '',
        'new',
        'バルーン・パーティー用品',
        'uballoon',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join('\t')
    })

    const header = [
      'id', 'title', 'description', 'link', 'image_link',
      'availability', 'price', 'gtin', 'condition',
      'product_type', 'brand',
    ].join('\t')

    const tsv = [header, ...items].join('\n')

    return new NextResponse(tsv, {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': 'attachment; filename="google-merchant-feed.tsv"',
      },
    })
  } catch (error) {
    console.error('Google Merchant feed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
