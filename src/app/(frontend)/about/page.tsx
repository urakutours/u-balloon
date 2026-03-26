import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '会社概要',
  description: '株式会社URAKUが運営するuBalloon（ユーバルーン）の会社概要。バルーンギフト・バルーン電報・ウェディング演出・パーティー装飾を通じて、お祝いの気持ちをかたちにします。',
}

const companyInfo = [
  { label: '会社名', value: '株式会社URAKU' },
  { label: '代表取締役', value: '奥山大介' },
  {
    label: '所在地',
    value: '〒108-0074\n東京都港区高輪2-1-13 高輪タウンハウス414',
  },
  { label: '電話番号', value: '03-6277-4682' },
  { label: 'メールアドレス', value: 'info@u-balloon.com', href: 'mailto:info@u-balloon.com' },
  { label: '営業時間', value: '平日 10:00〜17:00（土日祝休み）' },
  { label: 'URL', value: 'https://u-balloon.com', href: 'https://u-balloon.com' },
]

export default function AboutPage() {
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
          <span className="text-brand-dark">会社概要</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">
            会社概要
          </h1>
        </div>

        {/* Greeting */}
        <div className="mb-10 space-y-4 text-sm leading-relaxed text-gray-700 sm:text-base sm:leading-loose">
          <p>バルーンには、空間を一瞬で華やかに変え、人の心を動かす力があります。</p>
          <p>
            私たちUBALLOON（ユーバルーン）は、バルーンギフトやバルーン電報、ウェディング演出、パーティー装飾を通じて、お祝いの気持ちをかたちにするお手伝いをしています。
          </p>
          <p>
            誕生日、結婚式、記念日——人生の大切な瞬間をバルーンの力でより輝かせ、たくさんの笑顔を届けること。それが私たちの使命です。
          </p>
        </div>

        {/* Company Info Table */}
        <h2 className="mb-4 text-lg font-semibold text-brand-dark">会社情報</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <tbody>
              {companyInfo.map((item, i) => (
                <tr
                  key={item.label}
                  className={i % 2 === 1 ? 'bg-muted/30' : ''}
                >
                  <th className="w-1/3 whitespace-nowrap border-b px-6 py-4 text-left font-semibold text-brand-dark">
                    {item.label}
                  </th>
                  <td className="whitespace-pre-line border-b px-6 py-4 text-gray-700">
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80"
                      >
                        {item.value}
                      </a>
                    ) : (
                      item.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
