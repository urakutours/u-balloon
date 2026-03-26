'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { create } from 'zustand'
import { Search, Loader2, X } from 'lucide-react'

// ─── Zustand store ───

type SearchDialogStore = {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useSearchDialog = create<SearchDialogStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}))

// ─── Types ───

type SearchProduct = {
  id: string
  title: string
  slug: string
  price: number
  imageUrl: string | null
  tags: string[]
}

// ─── SearchDialog Component ───

export function SearchDialog() {
  const { isOpen, close } = useSearchDialog()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProduct[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const router = useRouter()

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setIsLoading(false)
      setHasSearched(false)
      // Focus input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useSearchDialog.getState().open()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setHasSearched(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setResults(data.products || [])
      setHasSearched(true)
    } catch {
      setResults([])
      setHasSearched(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setResults([])
      setHasSearched(false)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      search(value)
    }, 300)
  }

  // Navigate to product and close
  const handleSelect = (slug: string) => {
    close()
    router.push(`/products/${slug}`)
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Dialog container */}
      <div className="relative mx-auto mt-[10vh] w-full max-w-lg px-4 sm:mt-[15vh]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-brand-teal" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="商品を検索..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setResults([])
                  setHasSearched(false)
                  inputRef.current?.focus()
                }}
                className="shrink-0 text-foreground/40 hover:text-foreground/70"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden shrink-0 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Results area */}
          <div className="max-h-[50vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-brand-teal" />
              </div>
            )}

            {!isLoading && hasSearched && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                商品が見つかりませんでした
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <ul className="py-2">
                {results.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product.slug)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-pink-light"
                    >
                      {/* Product image */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted/30">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.title}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                            <Search className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {product.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          &yen;{product.price.toLocaleString()}
                          <span className="ml-0.5 text-xs">税込</span>
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!isLoading && !hasSearched && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground/60">
                商品名やタグで検索できます
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
