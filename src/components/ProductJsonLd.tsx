type Props = {
  product: {
    title: string
    slug: string
    price: number
    description?: string
    images?: Array<{ image: { url: string } }>
    sku?: string
    stock?: number | null
  }
  /** Brand name for schema.org Brand. Resolved from SiteSettings by callers. */
  brandName?: string
}

export function ProductJsonLd({ product, brandName = 'u-balloon' }: Props) {
  // NEXT_PUBLIC_APP_URL must be set per-instance. No shop-specific fallback.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const imageUrl = product.images?.[0]?.image?.url || ''
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${appUrl}${imageUrl}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: fullImageUrl || undefined,
    description: product.description || product.title,
    sku: product.sku || undefined,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
    offers: {
      '@type': 'Offer',
      url: `${appUrl}/products/${product.slug}`,
      priceCurrency: 'JPY',
      price: product.price,
      availability: product.stock == null || product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
