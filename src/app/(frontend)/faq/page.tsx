import React from 'react'
import Link from 'next/link'
import { HelpCircle, ChevronRight, Home } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'よくある質問',
  description: 'uballoonのよくある質問。バルーン電報の配送・注文・お支払いについてご案内いたします。',
}

const faqCategories = [
  {
    heading: '商品について',
    items: [
      {
        q: 'バルーン電報とは？',
        a: 'ヘリウムガスで浮くバルーンにメッセージカードを添えたギフトです。開封した瞬間にバルーンが浮き上がるサプライズ演出ができます。',
      },
      {
        q: 'バルーンはどのくらい持ちますか？',
        a: '環境にもよりますが、通常3〜7日程度浮遊します。直射日光や高温を避けていただくと長持ちします。',
      },
      {
        q: '名入れやカスタマイズはできますか？',
        a: 'はい、多くの商品で名入れやカスタマイズに対応しています。商品ページの「カスタマイズ」欄からご指定ください。',
      },
    ],
  },
  {
    heading: '配送について',
    items: [
      {
        q: '配送にかかる日数は？',
        a: '当日12時までのご注文で即日出荷可能です。土日祝日も発送しています。本州の一部エリアは送料無料です。',
      },
      {
        q: '会場やホテルに直接届けられますか？',
        a: 'はい、結婚式場やイベント会場への直接配送も承っています。必ず前日までに届くようご注文ください。受け取り可能か事前に会場へご確認をお願いいたします。',
      },
      {
        q: '配送中に割れることはありますか？',
        a: '万が一輸送中に破損があった場合は、良品と交換いたします。ご安心ください。',
      },
    ],
  },
  {
    heading: '注文・お支払いについて',
    items: [
      {
        q: '支払い方法は？',
        a: 'クレジットカード（Visa, Mastercard, JCB, American Express）でのお支払いが可能です。',
      },
      {
        q: 'キャンセルはできますか？',
        a: '出荷前のキャンセルは承ります。出荷後のキャンセルはお受けできません。',
      },
      {
        q: 'ポイントは使えますか？',
        a: 'はい、会員登録いただくとお買い物で3%のポイントが貯まり、次回のお買い物で1ポイント＝1円としてご利用いただけます。',
      },
    ],
  },
]

export default function FaqPage() {
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
          <span className="text-brand-dark">よくある質問</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-brand-dark">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">
            よくある質問
          </h1>
        </div>

        <div className="rounded-xl border p-6 sm:p-8">
          <div className="space-y-8">
            {faqCategories.map((category, catIdx) => (
              <div key={category.heading}>
                <h2 className="mb-4 text-lg font-semibold text-brand-dark">
                  {category.heading}
                </h2>
                <div className="divide-y">
                  {category.items.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex cursor-pointer items-center justify-between py-4 font-medium text-gray-800 transition-colors hover:text-brand-teal">
                        <span>Q. {item.q}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="pb-4 pl-1 text-sm leading-relaxed text-gray-600">
                        A. {item.a}
                      </div>
                    </details>
                  ))}
                </div>
                {catIdx < faqCategories.length - 1 && <div className="mt-4 border-b" />}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          その他ご不明な点がございましたら、お気軽に
          <Link href="/contact" className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80">
            お問い合わせ
          </Link>
          ください。
        </p>
      </div>
    </div>
  )
}
