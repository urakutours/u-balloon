'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type OptionProduct = {
  id: string
  title: string
  slug: string
  price: number
  imageUrl: string | null
}

type Props = {
  /** 現在の商品ID（自分自身を除外するため） */
  currentProductId: string
}

export function OptionProductsSlider({ currentProductId }: Props) {
  const [products, setProducts] = useState<OptionProduct[]>([])
  const [scrollIndex, setScrollIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch(`/api/option-products?exclude=${currentProductId}`)
        if (res.ok) {
          const data = await res.json()
          setProducts(data.products || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [currentProductId])

  if (loading || products.length === 0) return null

  const visibleCount = 4 // desktop
  const maxScroll = Math.max(0, products.length - visibleCount)
  const canScrollLeft = scrollIndex > 0
  const canScrollRight = scrollIndex < maxScroll

  return (
    <section className="mt-12 sm:mt-16">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold text-brand-teal sm:text-xl">
          一緒にいかがですか？
        </h2>
        <div className="hidden gap-1 sm:flex">
          <button
            onClick={() => setScrollIndex((i) => Math.max(0, i - 1))}
            disabled={!canScrollLeft}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-foreground/40 transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScrollIndex((i) => Math.min(maxScroll, i + 1))}
            disabled={!canScrollRight}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-foreground/40 transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="sm:hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {products.map((p) => (
            <OptionCard key={p.id} product={p} className="w-36 flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Desktop: grid with arrows */}
      <div className="hidden sm:block">
        <div className="overflow-hidden">
          <div
            className="flex gap-4 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${scrollIndex * (100 / visibleCount)}%)` }}
          >
            {products.map((p) => (
              <OptionCard key={p.id} product={p} className="w-1/4 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function OptionCard({ product, className }: { product: OptionProduct; className?: string }) {
  return (
    <Link href={`/products/${product.slug}`} className={`group ${className || ''}`}>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-white transition-all group-hover:border-border group-hover:shadow-md">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 144px, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl">🎈</div>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="mb-1 text-xs font-medium leading-tight text-foreground/80 line-clamp-2">
            {product.title}
          </h3>
          <p className="text-sm font-bold text-brand-dark">
            ¥{product.price.toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  )
}
