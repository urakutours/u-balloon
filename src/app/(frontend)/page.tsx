import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'uballoon | バルーンギフト・バルーン電報の通販',
  description: 'バルーンギフトで特別な日を彩ります。誕生日、結婚式、記念日に最適なバルーン電報・バルーンギフトの通販サイト。沖縄を除く全国へ発送、東京都心は即日配送対応。',
}
import { Button } from '@/components/ui/button'
import { ArrowRight, Truck, Clock, Gift } from 'lucide-react'

// ─── Shopifyメインメニュー「シーンで選ぶ」に準拠 ───
const SCENE_CATEGORIES = [
  { label: '誕生日', tag: '誕生日', emoji: '🎂' },
  { label: '1才の誕生日', tag: '1才の誕生日', emoji: '🎉' },
  { label: '結婚式', tag: '結婚', emoji: '💒' },
  { label: '出産祝い', tag: '出産', emoji: '👶' },
  { label: 'お見舞い', tag: 'お見舞い', emoji: '💐' },
  { label: '発表会', tag: '発表会', emoji: '🎵' },
  { label: '還暦祝い', tag: '還暦', emoji: '🎊' },
  { label: 'オールマイティ', tag: 'オールマイティ', emoji: '🎈' },
  { label: 'クリスマス', tag: 'クリスマス', emoji: '🎄' },
  { label: '母の日', tag: '母の日', emoji: '🌹' },
  { label: '開店・周年・移転', tag: '開店・周年・移転', emoji: '🏪' },
]

// ─── Shopifyメインメニュー「タイプで選ぶ」に準拠 ───
const TYPE_CATEGORIES = [
  { label: 'ラッピング', tag: 'ラッピング', emoji: '🎁' },
  { label: '置き型', tag: '置き型', emoji: '🫧' },
  { label: 'フリンジ', tag: 'フリンジ', emoji: '✂️' },
  { label: 'スパーク', tag: 'スパーク', emoji: '✨' },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero Section — モバイル 4:3 / デスクトップ 21:9 の hero 画像 + 中央揃えテキスト overlay */}
      <section className="relative overflow-hidden bg-brand-pink-light">
        {/*
          aspect 比:
            - モバイル: 4:3 (画像を縦に大きく、左寄せクロップで右を逃がす)
            - デスクトップ (sm 以上): 21:9 (横長 cinematic)
        */}
        <div className="relative aspect-[4/3] w-full min-h-[360px] sm:aspect-[21/9] sm:min-h-[420px]">
          <Image
            src="/hero-img.webp"
            alt="バルーンギフト・電報専門店 u-balloon"
            fill
            sizes="100vw"
            className="object-cover [object-position:30%_50%] sm:object-center"
            priority
          />

          {/* Text overlay (中央揃え、説明文なし、h1 大きく、白シャドウで読みやすさ確保) */}
          <div className="absolute inset-0 flex items-center justify-center pb-8 sm:pb-12">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
              <div className="mx-auto max-w-4xl text-center">
                <p className="mb-3 text-sm font-semibold tracking-wider text-[#3c9ced] uppercase [text-shadow:_0_0_40px_#ffffff8f] sm:mb-5 sm:text-base md:text-lg">
                  Make Them Smile
                </p>
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#3c9ced] [text-shadow:_0_0_40px_#ffffff8f] sm:text-5xl md:text-6xl lg:text-7xl">
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
            <path d="M0 60L1440 60L1440 30C1200 0 960 10 720 30C480 50 240 60 0 30L0 60Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* シーンで選ぶ */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-brand-teal sm:text-3xl">
            シーンで選ぶ
          </h2>
          <p className="text-sm text-foreground/50">
            お祝いのシーンに合わせたバルーンギフトをお選びください
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {SCENE_CATEGORIES.map((cat) => (
            <Link
              key={cat.tag}
              href={`/products?tag=${encodeURIComponent(cat.tag)}`}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/60 bg-white p-5 text-center transition-all hover:border-brand-pink/30 hover:shadow-md sm:p-6"
            >
              <span className="text-3xl transition-transform group-hover:scale-110 sm:text-4xl">
                {cat.emoji}
              </span>
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* タイプで選ぶ */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-20">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-brand-teal sm:text-3xl">
            タイプで選ぶ
          </h2>
          <p className="text-sm text-foreground/50">
            バルーンのタイプからお選びください
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TYPE_CATEGORIES.map((cat) => (
            <Link
              key={cat.tag}
              href={`/products?tag=${encodeURIComponent(cat.tag)}`}
              className="group flex flex-col items-center gap-2.5 rounded-xl border border-border/60 bg-white p-5 text-center transition-all hover:border-brand-pink/30 hover:shadow-md sm:p-6"
            >
              <span className="text-3xl transition-transform group-hover:scale-110 sm:text-4xl">
                {cat.emoji}
              </span>
              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3つのポイント Section */}
      <section className="bg-brand-pink-light/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
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

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="rounded-2xl bg-brand-dark px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <h2 className="mb-3 text-2xl font-bold sm:text-3xl">
            大切な人への贈り物を見つけよう
          </h2>
          <p className="mb-8 text-sm text-white/60 sm:text-base">
            バルーンギフトで、忘れられないサプライズを演出しませんか？
          </p>
          <Link href="/products">
            <Button size="lg" className="gap-2 bg-white px-8 font-semibold text-brand-dark hover:bg-white/90">
              全商品を見る
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
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
