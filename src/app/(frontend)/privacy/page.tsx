import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import type { Metadata } from 'next'
import { getStaticPage } from '@/lib/get-static-page'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage('privacy')
  return {
    title: page?.meta?.title || page?.title || 'プライバシーポリシー',
    description: page?.meta?.description || 'プライバシーポリシー - uballoon（ユーバルーン）株式会社URAKU',
  }
}

export default async function PrivacyPage() {
  const cmsPage = await getStaticPage('privacy')

  // TODO (B5 follow-up, post-launch): The hardcoded fallback below contains
  // u-balloon-specific text (company name, address, phone, email, URL).
  // Migrate this content into the Pages collection ('privacy' slug) so admin
  // can edit it without code changes, and replace the fallback with a generic
  // placeholder (e.g. an admin notice asking to create the Pages entry).
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
          <span className="text-brand-dark">プライバシーポリシー</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">
            プライバシーポリシー
          </h1>
        </div>

        <div className="rounded-xl border p-6 sm:p-8">
          <p className="mb-8 text-sm leading-relaxed text-gray-700">
            株式会社URAKU（以下「当社」といいます）は、当社が運営するオンラインストア「uBalloon」（https://u-balloon.com、以下「当サイト」といいます）において、お客様の個人情報を適切に保護し、取り扱うことが社会的責務であると考え、以下のとおりプライバシーポリシーを定めます。
          </p>

          <div className="space-y-8">
            {/* 1 */}
            <Section num={1} title="個人情報の収集について">
              <p>当社は、以下の場合にお客様の個人情報を収集することがあります。</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li>商品のご注文時（お名前、ご住所、電話番号、メールアドレス、お届け先情報）</li>
                <li>お問い合わせ時（お名前、メールアドレス、電話番号、お問い合わせ内容）</li>
                <li>メールマガジンへのご登録時（メールアドレス）</li>
                <li>アカウント作成時（お名前、メールアドレス）</li>
              </ul>
            </Section>

            {/* 2 */}
            <Section num={2} title="個人情報の利用目的">
              <p>収集した個人情報は、以下の目的で利用いたします。</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li>ご注文の処理、商品の発送、配送状況のご連絡</li>
                <li>お問い合わせへの回答、アフターサービスの提供</li>
                <li>ご注文内容の確認、お支払いに関するご連絡</li>
                <li>新商品やキャンペーン等のご案内（同意をいただいた場合に限ります）</li>
                <li>サービスの改善、品質向上のための分析</li>
                <li>不正利用の防止</li>
              </ul>
            </Section>

            {/* 3 */}
            <Section num={3} title="個人情報の第三者への提供">
              <p>当社は、以下の場合を除き、お客様の個人情報を第三者に提供することはありません。</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li>お客様の同意がある場合</li>
                <li>商品の配送のために配送業者（ヤマト運輸、日本郵便等）に必要な情報を提供する場合</li>
                <li>決済処理のために決済代行サービスに必要な情報を提供する場合</li>
                <li>法令に基づく場合</li>
              </ul>
            </Section>

            {/* 4 */}
            <Section num={4} title="Cookieの使用について">
              <p>当サイトでは、以下の目的でCookieを使用しています。</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li><strong>必須Cookie：</strong>ショッピングカート機能、ログイン状態の維持など、サイトの基本機能に必要なCookie</li>
                <li><strong>分析Cookie：</strong>サイトの利用状況を把握し、サービス改善に役立てるためのCookie</li>
                <li><strong>マーケティングCookie：</strong>お客様の興味に合わせた情報提供のためのCookie（同意をいただいた場合に限ります）</li>
              </ul>
              <p className="mt-3">ブラウザの設定によりCookieの受け取りを拒否することができますが、一部のサービスが正常に機能しなくなる場合がございます。</p>
            </Section>

            {/* 5 */}
            <Section num={5} title="アクセス解析ツールおよび外部サービス連携について">
              <p>当サイトでは、サービスの提供および改善のため、以下の外部サービスにお客様の情報の一部を送信または共有しています。各サービスのプライバシーポリシーに基づきデータが管理されます。</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li><strong>Google Analytics 4（Google LLC）：</strong>サイト利用状況の匿名分析。Cookieを使用しますが個人を特定する情報は含まれません。詳細は <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-teal underline underline-offset-2">Google のプライバシーポリシー</a> をご確認ください。</li>
                <li><strong>Stripe（Stripe, Inc.）：</strong>クレジットカード決済処理。お支払い情報（カード番号等）は当社サーバーには保存されず、Stripe が管理します。詳細は <a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-teal underline underline-offset-2">Stripe のプライバシーポリシー</a> をご確認ください。</li>
                <li><strong>Resend：</strong>注文確認・各種通知メールの送信。お客様のお名前・メールアドレス等を送信元として利用します。詳細は <a href="https://resend.com/" target="_blank" rel="noopener noreferrer" className="text-brand-teal underline underline-offset-2">Resend 公式サイト</a> よりプライバシーポリシーをご確認ください。</li>
                <li><strong>Cloudflare R2（Cloudflare, Inc.）：</strong>商品画像等のメディア配信。アクセスログが Cloudflare 側に記録されます。詳細は <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-brand-teal underline underline-offset-2">Cloudflare のプライバシーポリシー</a> をご確認ください。</li>
                <li><strong>Google Maps Platform（Google LLC）：</strong>配送距離計算のためお届け先住所を送信します。詳細は <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-teal underline underline-offset-2">Google のプライバシーポリシー</a> をご確認ください。</li>
              </ul>
              <p className="mt-3">ブラウザの設定によりCookieの受け取りを拒否することもできますが、一部のサービスが正常に機能しなくなる場合がございます。</p>
            </Section>

            {/* 6 */}
            <Section num={6} title="個人情報の管理・安全対策">
              <p>当社は、お客様の個人情報を適切に管理し、不正アクセス、紛失、改ざん、漏洩等を防止するため、以下の安全対策を講じています。</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6">
                <li>SSL/TLS暗号化通信による情報の保護</li>
                <li>アクセス権限の適切な管理</li>
                <li>セキュリティ対策の定期的な見直しと改善</li>
              </ul>
            </Section>

            {/* 7 */}
            <Section num={7} title="個人情報の開示・訂正・削除">
              <p>お客様は、当社が保有するご自身の個人情報について、開示・訂正・削除を請求することができます。ご希望の場合は、下記お問い合わせ窓口までご連絡ください。ご本人確認のうえ、合理的な期間内に対応いたします。</p>
            </Section>

            {/* 8 */}
            <Section num={8} title="プライバシーポリシーの変更">
              <p>当社は、法令の改正やサービス内容の変更等に伴い、本プライバシーポリシーを変更する場合がございます。変更後のポリシーは当サイトに掲載した時点より効力を生じるものとします。</p>
            </Section>

            {/* 9 */}
            <Section num={9} title="お問い合わせ窓口" last>
              <p>個人情報の取り扱いに関するお問い合わせは、以下までご連絡ください。</p>
              <p className="mt-3">
                株式会社URAKU
                <br />
                メールアドレス：
                <a href="mailto:info@u-balloon.com" className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80">
                  info@u-balloon.com
                </a>
                <br />
                電話番号：03-6277-4682（平日 10:00〜17:00）
              </p>
            </Section>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          制定日：2026年3月
        </p>
      </div>
    </div>
  )
}

function Section({
  num,
  title,
  children,
  last,
}: {
  num: number
  title: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-brand-dark">
        {num}. {title}
      </h2>
      <div className="text-sm leading-relaxed text-gray-700">{children}</div>
      {!last && <div className="mt-8 border-b" />}
    </div>
  )
}
