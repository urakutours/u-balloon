'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type SaleProduct = {
  product: {
    id: string
    title: string
    slug: string
    price: number
    images?: Array<{ image: { url: string; alt: string } }>
  }
  salePrice: number
}

type SaleData = {
  name: string
  description?: unknown
  bannerImage?: { url: string; alt: string }
  products: SaleProduct[]
  validUntil?: string
}

export default function SecretSalePage() {
  const { slug } = useParams()
  const [sale, setSale] = useState<SaleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')

  const fetchSale = async (pw?: string) => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/secret-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, password: pw }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.requiresPassword) {
        setRequiresPassword(true)
      } else {
        setError(data.error)
      }
      setLoading(false)
      return
    }

    setSale(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchSale()
  }, [slug])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (requiresPassword && !sale) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="mb-4 text-2xl font-bold">シークレットセール</h1>
        <p className="mb-6 text-gray-600">このセールはパスワードで保護されています</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            fetchSale(password)
          }}
          className="space-y-4"
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            className="w-full rounded-lg border px-4 py-3 text-center"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-pink-500 py-3 font-semibold text-white hover:bg-pink-600"
          >
            入場する
          </button>
        </form>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  if (!sale) return null

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      {sale.bannerImage?.url && (
        <img
          src={sale.bannerImage.url}
          alt={sale.bannerImage.alt || sale.name}
          className="mb-8 h-64 w-full rounded-lg object-cover"
        />
      )}

      <h1 className="mb-2 text-3xl font-bold">{sale.name}</h1>
      {sale.validUntil && (
        <p className="mb-8 text-sm text-red-600">
          終了: {new Date(sale.validUntil).toLocaleString('ja-JP')}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sale.products?.map((item, i) => {
          const product = item.product
          const discountPercent = Math.round((1 - item.salePrice / product.price) * 100)
          const firstImage = product.images?.[0]?.image

          return (
            <Link key={i} href={`/products/${product.slug}`} className="group">
              <div className="overflow-hidden rounded-lg border transition hover:shadow-md">
                {firstImage?.url && (
                  <div className="relative">
                    <img
                      src={firstImage.url}
                      alt={firstImage.alt || product.title}
                      className="h-48 w-full object-cover transition group-hover:scale-105"
                    />
                    <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      {discountPercent}% OFF
                    </span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold">{product.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      ¥{item.salePrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      ¥{product.price.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
