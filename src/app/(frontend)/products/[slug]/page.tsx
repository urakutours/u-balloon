import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './ProductDetailClient'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'products',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
  })

  const product = result.docs[0]
  if (!product) notFound()

  // Serialize images
  const images: { url: string; alt: string }[] = []
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (img?.image && typeof img.image === 'object' && 'url' in img.image) {
        images.push({
          url: img.image.url as string,
          alt: (img.image as { alt?: string }).alt || product.title || '',
        })
      }
    }
  }

  const customOptions = product.customOptions as {
    selectOptions?: {
      name: string
      required: boolean
      choices: { label: string; additionalPrice?: number; id?: string }[]
      id?: string
    }[]
    textInputs?: {
      name: string
      required: boolean
      placeholder?: string
      price?: number
      id?: string
    }[]
  } | undefined

  const serialized = {
    id: product.id as string,
    title: product.title as string,
    slug: product.slug as string,
    sku: (product.sku as string | undefined) || '',
    price: product.price as number,
    productType: product.productType as 'standard' | 'delivery',
    tags: (product.tags as string[] | undefined) || [],
    bodyHtml: (product.bodyHtml as string | undefined) || '',
    images,
    selectOptions: (customOptions?.selectOptions || []).map((opt) => ({
      name: opt.name,
      required: opt.required ?? false,
      choices: (opt.choices || []).map((c) => ({
        label: c.label,
        additionalPrice: c.additionalPrice || 0,
      })),
    })),
    textInputs: (customOptions?.textInputs || []).map((inp) => ({
      name: inp.name,
      required: inp.required ?? false,
      placeholder: inp.placeholder || '',
      price: inp.price || 0,
    })),
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <ProductDetailClient product={serialized} />
    </div>
  )
}
