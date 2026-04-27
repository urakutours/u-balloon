'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type FeaturedProduct = {
  id: string
  title: string
  slug: string
  price: number
  imageUrl: string | null
}

type Props = {
  title: string
  subtitle: string
  products: FeaturedProduct[]
}

export function FeaturedProductsCarousel({ title, subtitle, products }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const update = () => {
      setCanLeft(el.scrollLeft > 4)
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [products.length])

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-carousel-card]')
    // 1 click = カード 2 枚分スライド (snap-proximity でちょうど 2 枚スナップ)
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.5
    const target = el.scrollLeft + step * dir * 2
    // smooth + snap-mandatory はブラウザ実装で 1 step しか動かないことがあるため
    // snap は proximity を採用し、scrollTo で確実に target 位置を指定する
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 text-center sm:mb-8">
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-brand-teal sm:text-3xl">
          {title}
        </h2>
        <p className="text-sm text-foreground/60">{subtitle}</p>
      </div>

      <div className="relative">
        {canLeft && (
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="前へ"
            className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/90 backdrop-blur shadow-sm hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5 text-foreground/70" />
          </button>
        )}
        {canRight && (
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="次へ"
            className="absolute right-0 top-1/2 z-10 hidden translate-x-1/2 -translate-y-1/2 sm:flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/90 backdrop-blur shadow-sm hover:bg-white"
          >
            <ChevronRight className="h-5 w-5 text-foreground/70" />
          </button>
        )}

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide snap-x snap-proximity pb-2"
        >
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              data-carousel-card
              className="group w-[44vw] sm:w-[28%] md:w-[22%] lg:w-[18%] flex-shrink-0 snap-start"
            >
              <div className="overflow-hidden rounded-xl border border-border/60 bg-white transition-all group-hover:border-border group-hover:shadow-md">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 18vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl">🎈</div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="mb-1 text-xs font-medium leading-tight text-foreground/80 line-clamp-2 sm:text-sm">
                    {p.title}
                  </h3>
                  <p className="text-sm font-bold text-brand-dark sm:text-base">
                    ¥{p.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
