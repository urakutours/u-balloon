import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { FeaturedProductsCarousel, type FeaturedProduct } from './FeaturedProductsCarousel'

export type FeaturedCategory = {
  title: string
  subtitle: string
  skus: string[]
}

// TOP のおすすめ商品セクション。SKU 直指定でカテゴリを定義する。
// 将来的には Pages.layout の blocks 化で管理画面から編集できるようにする予定
// (post-launch-todo.md 参照)。
export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    title: 'シーンに合わせてカスタマイズ',
    subtitle: 'お祝いのシーンに合わせてカスタマイズできるバルーンギフト',
    skus: ['g-prf-0001', 'g-prf-0002', 'g-prf-0003'],
  },
  {
    title: '名入れできるバルーン',
    subtitle: 'お名前やメッセージを入れて贈れる、特別感あふれる一品',
    skus: [
      'g-prf-0005',
      'g-prf-0006',
      'g-prf-0007',
      'g-prf-0017',
      'g-prf-0013',
      'g-prf-0014',
      'g-prf-0012',
      'g-prf-0011',
      'g-prf-0015',
    ],
  },
  {
    title: '人気のフリンジバルーン',
    subtitle: '華やかな見た目で人気急上昇のフリンジバルーン',
    skus: ['g-prf-0020', 'g-prf-0019', 'g-prf-0013', 'g-prf-0014'],
  },
  {
    title: 'スパークバルーン',
    subtitle: 'キラキラ弾けて、お祝いを華やかに演出',
    skus: ['g-alm-0051', 'g-prf-0016'],
  },
  {
    title: 'バルーンリリース（東京都港区からデリバリー）',
    subtitle: '東京都港区から即時配送、空に飛ばすバルーンリリース',
    skus: ['d-rls-0026', 'd-rls-0001', 'd-rls-0050', 'd-rls-0025'],
  },
]

function getImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null
  const first = images[0] as { image?: { url?: string } } | undefined
  if (first?.image && typeof first.image === 'object' && 'url' in first.image) {
    return first.image.url ?? null
  }
  return null
}

export async function FeaturedProductsSection() {
  const allSkus = Array.from(new Set(FEATURED_CATEGORIES.flatMap((c) => c.skus)))
  const payload = await getPayload({ config })

  let products: FeaturedProduct[] = []
  try {
    const result = await payload.find({
      collection: 'products',
      where: {
        and: [
          { status: { equals: 'published' } },
          { sku: { in: allSkus } },
        ],
      },
      limit: 100,
      depth: 1,
    })

    products = result.docs.map((p) => ({
      id: String(p.id),
      title: (p.title as string) ?? '',
      slug: (p.slug as string) ?? '',
      price: (p.price as number) ?? 0,
      sku: (p.sku as string) ?? '',
      imageUrl: getImageUrl(p.images),
    })) as (FeaturedProduct & { sku: string })[]
  } catch (err) {
    console.error('[FeaturedProductsSection] failed to load products:', err)
    return null
  }

  const bySku = new Map<string, FeaturedProduct & { sku: string }>(
    (products as (FeaturedProduct & { sku: string })[]).map((p) => [p.sku, p]),
  )

  return (
    <>
      {FEATURED_CATEGORIES.map((cat) => {
        const items = cat.skus
          .map((sku) => bySku.get(sku))
          .filter((p): p is FeaturedProduct & { sku: string } => Boolean(p))
        if (items.length === 0) return null
        return (
          <FeaturedProductsCarousel
            key={cat.title}
            title={cat.title}
            subtitle={cat.subtitle}
            products={items}
          />
        )
      })}
    </>
  )
}
