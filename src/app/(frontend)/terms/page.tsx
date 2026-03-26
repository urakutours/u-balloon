import React from 'react'
import Link from 'next/link'
import { FileText, ChevronRight, Home } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '利用規約',
  description: '利用規約 - uballoon（ユーバルーン）',
}

const sections = [
  {
    title: '適用範囲',
    content:
      '本利用規約（以下「本規約」）は、uballoon（以下「当ショップ」）が提供するオンラインショッピングサービスの利用に関する条件を定めるものです。\n\nお客様が当ショップを利用された場合、本規約に同意いただいたものとみなします。',
  },
  {
    title: '注文と契約',
    content:
      '・お客様が当ショップで商品を注文し、当ショップが注文確認メールを送信した時点で売買契約が成立します。\n・在庫状況や注文内容に問題がある場合、当ショップは注文をお断りする場合がございます。\n・商品画像はイメージであり、実際の商品と色味やサイズが若干異なる場合がございます。\n・バルーン商品は手作業で制作するため、仕上がりに個体差が生じる場合がございます。',
  },
  {
    title: '支払い',
    content:
      '・お支払い方法はクレジットカード（Visa, Mastercard, JCB, American Express）をご利用いただけます。\n・商品代金および送料はご注文時に決済されます。\n・すべての価格は税込表示です。',
  },
  {
    title: '配送',
    content:
      '・当日12時までのご注文で即日出荷が可能です（土日祝日も発送）。\n・配送先やお届け日時のご指定が可能です。詳しくは配送ポリシーをご確認ください。\n・天候や交通事情等により、お届けが遅れる場合がございます。\n・バルーン商品は浮力の関係上、配送エリアに制限がある場合がございます。',
  },
  {
    title: '返品・交換',
    content:
      '・バルーン商品の性質上、お客様都合による返品・交換はお受けできません。\n・輸送中の破損や注文と異なる商品が届いた場合は、商品到着後3日以内にご連絡ください。良品と交換いたします。\n・交換品の在庫がない場合は、返金にて対応させていただきます。',
  },
  {
    title: '免責事項',
    content:
      '・当ショップは、以下の事項について一切の責任を負いません。\n　- お客様の取り扱いによるバルーンの破損・しぼみ\n　- バルーンの浮遊時間（環境や気温により変動します）\n　- 天災、配送事故その他不可抗力による損害\n・当ショップのウェブサイトに掲載される情報の正確性について万全を期しておりますが、その完全性を保証するものではありません。',
  },
  {
    title: '知的財産権',
    content:
      '当ショップのウェブサイトに掲載されるすべてのコンテンツ（テキスト、画像、ロゴ、デザイン等）に関する知的財産権は、当ショップまたは正当な権利者に帰属します。\n\nこれらのコンテンツを無断で複製、転載、改変、再配布することを禁じます。',
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-brand-pink-light">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 text-sm text-brand-dark/60">
          <Link href="/" className="flex items-center gap-1 transition-colors hover:text-brand-dark">
            <Home className="h-3.5 w-3.5" />
            ホーム
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-brand-dark">利用規約</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-brand-dark">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">
            利用規約
          </h1>
        </div>

        <div className="rounded-xl border p-6 sm:p-8">
          <div className="space-y-8">
            {sections.map((section, i) => (
              <div key={section.title}>
                <h2 className="mb-4 text-lg font-semibold text-brand-dark">
                  {i + 1}. {section.title}
                </h2>
                <div className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                  {section.content}
                </div>
                {i < sections.length - 1 && <div className="mt-8 border-b" />}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          最終更新日: 2026年3月25日
        </p>
      </div>
    </div>
  )
}
