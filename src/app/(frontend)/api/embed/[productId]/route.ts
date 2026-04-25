import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

type Params = { params: Promise<{ productId: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { productId } = await params
  // NEXT_PUBLIC_APP_URL must be set per-instance. No shop-specific fallback.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  try {
    const payload = await getPayload({ config })
    const product = await payload.findByID({
      collection: 'products',
      id: productId,
      depth: 1,
    }) as any

    if (!product || product.status !== 'published') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const imageUrl = product.images?.[0]?.image?.url || ''

    return NextResponse.json({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      imageUrl: imageUrl.startsWith('http') ? imageUrl : `${appUrl}${imageUrl}`,
      productUrl: `${appUrl}/products/${product.slug}`,
      stock: product.stock,
      available: product.stock == null || product.stock > 0,
    })
  } catch {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }
}
