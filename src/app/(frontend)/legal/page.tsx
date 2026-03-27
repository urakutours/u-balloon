import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import type { Metadata } from 'next'
import { getStaticPage } from '@/lib/get-static-page'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage('legal')
  return {
    title: page?.meta?.title || page?.title || '特定商取引法に基づく表記',
    description: page?.meta?.description || '特定商取引法に基づく表記 - uballoon（ユーバルーン）株式会社URAKU',
  }
}

const legalItems: { label: string; value: React.ReactNode }[] = [
  { label: '販売業者', value: '株式会社URAKU' },
  { label: '運営統括責任者', value: '奥山大介' },
  {
    label: '所在地',
    value: (
      <>
        〒108-0074
        <br />
        東京都港区高輪2-1-13 高輪タウンハウス414
      </>
    ),
  },
  { label: '電話番号', value: '03-6277-4682（平日 10:00〜17:00）' },
  {
    label: 'メールアドレス',
    value: (
      <a href="mailto:info@u-balloon.com" className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80">
        info@u-balloon.com
      </a>
    ),
  },
  { label: '販売価格', value: '各商品ページに表示（税込価格）' },
  {
    label: '商品代金以外の必要料金',
    value: (
      <>
        ・消費税（税込価格に含む）
        <br />
        ・送料（地域により異なります。詳細は下記「送料」欄をご確認ください）
        <br />
        ・振込手数料（銀行振込の場合、お客様ご負担）
      </>
    ),
  },
  {
    label: 'お支払い方法',
    value: (
      <>
        <strong>クレジットカード</strong>
        <br />
        VISA / Mastercard / American Express / JCB / Diners Club / Discover
        <br />
        <br />
        <strong>銀行振込（前払い）</strong>
        <br />
        PayPay銀行 本店営業部 普通 2409635 カ）ウラク
        <br />
        ※振込手数料はお客様のご負担となります
      </>
    ),
  },
  {
    label: 'お支払い期限',
    value: (
      <>
        クレジットカード：ご注文確定時に決済
        <br />
        銀行振込：ご注文後7日以内にお振込みください。期限内にご入金がない場合、ご注文をキャンセルとさせていただく場合がございます。
      </>
    ),
  },
  {
    label: '商品の引渡し時期',
    value: (
      <>
        クレジットカード：ご注文確定後、通常2〜5営業日以内に発送いたします。
        <br />
        銀行振込：ご入金確認後、通常2〜5営業日以内に発送いたします。
        <br />
        ※土日祝日は受注・発送業務をお休みしております。
        <br />
        ※在庫状況によりお届けまでにお時間をいただく場合がございます。
      </>
    ),
  },
  {
    label: '配送業者',
    value: (
      <>
        ヤマト運輸 / ゆうパック
        <br />
        ※商品やお届け先に応じて最適な方法で発送いたします。
      </>
    ),
  },
  {
    label: '送料',
    value: (
      <>
        関東・信越・北陸・東海・南東北：無料
        <br />
        関西：200円（税込）
        <br />
        中国・四国：400円（税込）
        <br />
        北海道・北東北：700円（税込）
        <br />
        九州：800円（税込）
        <br />
        <br />
        <strong>※沖縄県への配送はお受けできません。</strong>
        バルーンはヘリウムガスで膨らませているため、気圧の変化により破裂する恐れがあります。
        <br />
        ※離島へのお届けはお受けできない場合がございます。事前にお問い合わせください。
      </>
    ),
  },
  {
    label: '返品・交換について',
    value: (
      <>
        バルーン商品の性質上、お客様のご都合による返品・交換はお受けできません。
        <br />
        <br />
        <strong>配送中の破損・不良品の場合：</strong>
        <br />
        商品到着後3日以内にご連絡ください。状況を確認のうえ、以下のいずれかで対応いたします。
        <br />
        ・同一商品の再発送
        <br />
        ・ご返金
        <br />
        <br />
        ※バルーン商品の性質上、状況に応じて商品の処分をお願いする場合がございます（返送不要）。
      </>
    ),
  },
  { label: '返品送料', value: '不良品・破損の場合は当社負担' },
  {
    label: '申込みの有効期限',
    value: 'ご注文後7日以内にお支払いがない場合はキャンセルとさせていただきます。',
  },
]

export default async function LegalPage() {
  const cmsPage = await getStaticPage('legal')

  if (cmsPage?.layout?.length) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand-pink-light">
          <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 text-sm text-brand-dark/60">
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-brand-dark">
              <Home className="h-3.5 w-3.5" />
              ホーム
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-brand-dark">{cmsPage.title}</span>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">{cmsPage.title}</h1>
          </div>
          <BlockRenderer blocks={cmsPage.layout} />
        </div>
      </div>
    )
  }

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
          <span className="text-brand-dark">特定商取引法に基づく表記</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">
            特定商取引法に基づく表記
          </h1>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <tbody>
              {legalItems.map((item, i) => (
                <tr
                  key={item.label}
                  className={i % 2 === 1 ? 'bg-muted/30' : ''}
                >
                  <th className="w-1/3 whitespace-nowrap border-b px-6 py-4 text-left align-top font-semibold text-brand-dark">
                    {item.label}
                  </th>
                  <td className="border-b px-6 py-4 leading-relaxed text-gray-700">
                    {item.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          最終更新日: 2026年3月
        </p>
      </div>
    </div>
  )
}
