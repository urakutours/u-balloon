import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ProductListClient } from './ProductListClient'

const PAGE_SIZE = 20

// Tag display names for metadata
const TAG_LABELS: Record<string, string> = {
  '誕生日': '誕生日のバルーン電報',
  '1才の誕生日': '1才の誕生日のバルーン電報',
  '結婚': '結婚式のバルーン電報',
  '出産': '出産祝いのバルーン電報',
  'お見舞い': 'お見舞いのバルーン電報',
  '発表会': '発表会のバルーン電報',
  '還暦': '還暦祝いのバルーン電報',
  'オールマイティ': 'オールマイティなバルーン電報',
  'クリスマス': 'クリスマスのバルーン電報',
  '母の日': '母の日のバルーン電報',
  '開店・周年・移転': '開店・周年・移転祝いのバルーン電報',
  'ラッピング': 'ラッピングバルーン',
  '置き型': '置き型バルーン',
  'フリンジ': 'フリンジバルーン',
  'スパーク': 'スパークバルーン',
  'オプション': 'オプション',
  'カスタマイズ': 'カスタマイズ対応バルーン',
  'リリース': 'バルーンリリース',
  '動物': '動物のバルーン電報',
  'キャラクター': 'キャラクターバルーン',
  'パーティー': 'パーティーバルーン',
}

type SearchParams = Promise<{ tag?: string }>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { tag } = await searchParams
  const title = tag ? TAG_LABELS[tag] || tag : '商品一覧'
  return {
    title,
    description: `uballoonの${title}。バルーンギフトでお祝いを彩りましょう。`,
  }
}

// ISR: 60秒キャッシュ
export const revalidate = 60

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const { tag } = await searchParams
  const payload = await getPayload({ config })

  // Fetch all published products (tags is JSON so can't filter via SQL)
  const allProducts = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    limit: 500,
    sort: '-createdAt',
  })

  // Serialize
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

  // Filter by tag on server side (in-memory)
  const filtered = tag
    ? allSerialized.filter((p) => p.tags.includes(tag))
    : allSerialized

  // Default sort: recommended (popularity desc, then newest)
  filtered.sort((a, b) => b.popularityScore - a.popularityScore)

  // Only send the first page to the client
  const initialProducts = filtered.slice(0, PAGE_SIZE)
  const totalDocs = filtered.length
  const totalPages = Math.ceil(totalDocs / PAGE_SIZE)

  const pageTitle = tag ? TAG_LABELS[tag] || tag : '商品一覧'

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<div className="py-10 text-center text-sm text-foreground/50">読み込み中...</div>}>
        <ProductListClient
          initialProducts={initialProducts}
          totalDocs={totalDocs}
          totalPages={totalPages}
          currentTag={tag || null}
          pageTitle={pageTitle}
        />
      </Suspense>
    </div>
  )
}

function getImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null
  const first = images[0]
  if (first?.image && typeof first.image === 'object' && 'url' in first.image) {
    return first.image.url as string
  }
  return null
}
