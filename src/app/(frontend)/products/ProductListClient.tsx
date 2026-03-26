'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Loader2, ArrowUpDown } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { useCartDrawer } from '@/components/CartDrawer'

type Product = {
  id: string
  title: string
  slug: string
  price: number
  productType: 'standard' | 'delivery'
  tags: string[]
  imageUrl: string | null
  sku?: string
  customOptions?: {
    selectOptions?: unknown[]
    textInputs?: unknown[]
  }
}

type SortOrder = 'recommended' | 'newest' | 'price-asc' | 'price-desc'

type Props = {
  initialProducts: Product[]
  totalDocs: number
  totalPages: number
  currentTag: string | null
  pageTitle: string
}

export function ProductListClient({
  initialProducts,
  totalDocs,
  totalPages,
  currentTag,
  pageTitle,
}: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('recommended')
  const addItem = useCartStore((s) => s.addItem)
  const openCartDrawer = useCartDrawer((s) => s.open)

  // Store current URL in sessionStorage so product detail can link back here
  useEffect(() => {
    const url = currentTag
      ? `/products?tag=${encodeURIComponent(currentTag)}`
      : '/products'
    sessionStorage.setItem('uballoon-products-url', url)
  }, [currentTag])

  const [allLoaded, setAllLoaded] = useState(false)
  const hasMore = !allLoaded && currentPage < totalPages

  // When sort changes, reload from API
  const [isInitialMount, setIsInitialMount] = useState(true)
  useEffect(() => {
    // Skip the initial mount (server already provides recommended sort)
    if (isInitialMount) {
      setIsInitialMount(false)
      return
    }
    setLoading(true)
    const params = new URLSearchParams({ page: '1', sort: sortOrder })
    if (currentTag) params.set('tag', currentTag)
    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products)
        setCurrentPage(1)
        setAllLoaded(false)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const nextPage = currentPage + 1
      const params = new URLSearchParams({ page: String(nextPage) })
      if (currentTag) params.set('tag', currentTag)
      params.set('sort', sortOrder)

      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      setProducts((prev) => [...prev, ...data.products])
      setCurrentPage(nextPage)
      if (!data.hasNextPage) setAllLoaded(true)
    } catch (err) {
      console.error('Failed to load more products:', err)
    } finally {
      setLoading(false)
    }
  }, [currentPage, currentTag, hasMore, loading, sortOrder])

  const remainingCount = totalDocs - products.length

  // Check if product is "simple" (no required custom options)
  const isSimpleProduct = (product: Product) => {
    const opts = product.customOptions
    if (!opts) return true
    const hasRequiredSelects = Array.isArray(opts.selectOptions) && opts.selectOptions.length > 0
    const hasRequiredTexts = Array.isArray(opts.textInputs) && opts.textInputs.length > 0
    return !hasRequiredSelects && !hasRequiredTexts
  }

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      productId: product.id,
      productSlug: product.slug,
      title: product.title,
      price: product.price,
      productType: product.productType,
      imageUrl: product.imageUrl || undefined,
      quantity: 1,
      options: {},
      optionTotal: 0,
      unitPrice: product.price,
    })
    openCartDrawer()
  }

  return (
    <>
      {/* Page heading */}
      <div className="mb-6 flex items-end justify-between sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-teal sm:text-3xl">
            {pageTitle}
          </h1>
          {totalDocs > 0 && (
            <p className="mt-1 text-sm text-foreground/40">
              {totalDocs}件
            </p>
          )}
        </div>

        {/* Sort control */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-foreground/40" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="rounded-md border border-border/60 bg-white px-2.5 py-1.5 text-xs text-foreground/70 outline-none transition-colors hover:border-border focus:border-brand-teal sm:text-sm"
          >
            <option value="recommended">おすすめ順</option>
            <option value="newest">新着順</option>
            <option value="price-asc">価格が安い順</option>
            <option value="price-desc">価格が高い順</option>
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <span className="text-4xl">🎈</span>
          <p className="text-sm text-muted-foreground">
            該当する商品がありません
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="group">
                <div className="overflow-hidden rounded-xl border border-border/60 bg-white transition-all group-hover:border-border group-hover:shadow-lg">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl sm:text-5xl">
                        🎈
                      </div>
                    )}

                    {/* Badges */}
                    {product.productType === 'delivery' && (
                      <Badge className="absolute left-2 top-2 border-0 bg-brand-pink text-[10px] font-semibold text-white sm:text-xs">
                        デリバリー
                      </Badge>
                    )}

                    {/* Quick add button (for simple products only) */}
                    {isSimpleProduct(product) && (
                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand-dark shadow-md opacity-0 backdrop-blur-sm transition-all hover:bg-white hover:scale-110 group-hover:opacity-100"
                        aria-label="カートに追加"
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 sm:p-4">
                    <h3 className="mb-1.5 min-h-[2.5em] text-xs font-medium leading-tight text-foreground/80 line-clamp-2 sm:text-sm">
                      {product.title}
                    </h3>
                    <p className="text-sm font-bold text-brand-dark sm:text-base">
                      ¥{product.price.toLocaleString()}
                      <span className="ml-1 text-[10px] font-normal text-foreground/40">税込</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* "もっと見る" pagination button */}
          {hasMore && remainingCount > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                className="flex items-center gap-2 rounded-full border border-brand-dark/20 bg-white px-8 py-3 text-sm font-medium text-brand-dark transition-all hover:border-brand-dark/40 hover:shadow-md active:scale-[0.98] disabled:opacity-50"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    読み込み中...
                  </>
                ) : (
                  <>もっと見る（残り {remainingCount} 件）</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}
