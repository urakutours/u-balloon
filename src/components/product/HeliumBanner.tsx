'use client'

import React from 'react'
import Link from 'next/link'
import { detectProductType, shouldShowHeliumBanner } from '@/lib/product-types'
import { ArrowRight } from 'lucide-react'

type Props = {
  sku?: string
  tags: string[]
}

export function HeliumBanner({ sku, tags }: Props) {
  const typeInfo = detectProductType(sku, tags)
  const { showRecommend, showPartial } = shouldShowHeliumBanner(sku, typeInfo)

  if (!showRecommend && !showPartial) return null

  return (
    <Link
      href="/products/g-mat-0043"
      className="group mt-4 flex items-center gap-4 rounded-xl border border-border/60 bg-brand-pink-light/30 p-4 transition-all hover:border-brand-pink/30 hover:bg-brand-pink-light/50"
    >
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-brand-pink-light text-2xl">
        🎈
      </div>
      <div className="flex-1">
        <p className="text-sm leading-relaxed text-foreground/70">
          {showRecommend
            ? 'フィルムバルーンはヘリウムガスを補充すると、さらに長くお楽しみいただけます。'
            : 'セットに含まれるフィルムバルーンにはヘリウムガスを補充できます。'}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-teal transition-colors group-hover:text-brand-teal-bright">
          ヘリウムガス補充缶はこちら
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  )
}
