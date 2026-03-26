import React from 'react'
import Link from 'next/link'
import '../app/(frontend)/globals.css'

export default function RootNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 text-6xl">🎈</div>
      <h1 className="mb-3 text-2xl font-bold text-brand-teal sm:text-3xl">
        ページが見つかりませんでした
      </h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-500">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-brand-dark px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark/90"
        >
          トップに戻る
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-full border border-brand-dark px-6 py-2.5 text-sm font-medium text-brand-dark transition-colors hover:bg-gray-50"
        >
          商品を見る
        </Link>
      </div>
    </div>
  )
}
