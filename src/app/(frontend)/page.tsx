import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import { Truck, Clock, Gift } from 'lucide-react'
import { FeaturedProductsSection } from '@/components/home/FeaturedProductsSection'

export const metadata: Metadata = {
  title: 'uballoon | バルーンギフト・バルーン電報の通販',
  description:
    'バルーンギフトで特別な日を彩ります。誕生日、結婚式、記念日に最適なバルーン電報・バルーンギフトの通販サイト。沖縄を除く全国へ発送、東京都心は即日配送対応。',
}

export default function HomePage() {
  return (
    <div>
      {/* Hero Section — モバイル 4:3 / デスクトップ 21:9 の hero 画像 + 中央揃えテキスト overlay */}
      <section className="relative overflow-hidden bg-brand-pink-light">
        <div className="relative aspect-[4/3] w-full min-h-[360px] sm:aspect-[21/9] sm:min-h-[420px]">
          <Image
            src="/hero-img.webp"
            alt="バルーンギフト・電報専門店 u-balloon"
            fill
            sizes="100vw"
            className="object-cover [object-position:40%_50%] sm:object-center"
            priority
          />

          {/*
            Soft radial highlight under the headline so the text reads naturally
            against the busy hero image without darkening or washing out the photo.
            ~52% white at center, fading to transparent over ~60% of the box width.
          */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_60%_45%_at_50%_55%,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.25)_45%,rgba(255,255,255,0)_75%)]"
          />

          <div className="absolute inset-0 flex items-center justify-center pb-8 sm:pb-12">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <div className="mx-auto max-w-4xl text-center">
                <p
                  className="mb-3 font-serif italic text-2xl font-medium tracking-wide text-[#008dc5] [text-shadow:_0_1px_2px_rgba(255,255,255,0.7),_0_0_24px_rgba(255,255,255,0.85)] sm:mb-5 sm:text-3xl md:text-4xl lg:text-5xl"
                  style={{ fontFamily: 'var(--font-eb-garamond), serif' }}
                >
                  Make Them Smile
                </p>
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#008dc5] [text-shadow:_0_1px_2px_rgba(255,255,255,0.7),_0_0_32px_rgba(255,255,255,0.9)] sm:text-5xl md:text-6xl lg:text-7xl">
                  特別な日を
                  <br />
                  <span className="text-brand-pink">バルーン</span>で彩ろう
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative wave (hero と次セクションの境目) */}
        <div className="absolute -bottom-1 left-0 right-0 pointer-events-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 60L1440 60L1440 30C1200 0 960 10 720 30C480 50 240 60 0 30L0 60Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* 3つのポイント Section (hero と おすすめ商品 の間) */}
      <section className="bg-brand-pink-light/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
            <FeatureCard
              icon={<Truck className="h-8 w-8" />}
              title="急ぎのお届けにも対応します"
              description="本州の一部送料無料でお届け。急ぎの場合はお電話にてご相談ください。"
            />
            <FeatureCard
              icon={<Clock className="h-8 w-8" />}
              title="即日出荷OK・土日祝も発送"
              description="当日12時までのご注文で即日出荷可能。土日祝日も発送します。（不定休）"
            />
            <FeatureCard
              icon={<Gift className="h-8 w-8" />}
              title="バルーンにメッセージを添えて"
              description="お祝いの気持ちをメッセージカードにしてお付けします（無料）。"
            />
          </div>
        </div>
      </section>

      {/* おすすめ商品 (5 カテゴリ × 横スクロール) */}
      <FeaturedProductsSection />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mb-5 flex h-14 w-14 items-center justify-center text-brand-teal">
        {icon}
      </div>
      <h3 className="mb-3 text-base font-semibold text-brand-teal">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground/60">{description}</p>
    </div>
  )
}
