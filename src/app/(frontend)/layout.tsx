import React from 'react'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartDrawer } from '@/components/CartDrawer'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
})

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'uballoon | バルーンギフト・バルーン電報の通販',
    template: '%s | uballoon',
  },
  description: 'バルーンギフトで特別な日を彩ります。誕生日、結婚式、記念日に最適なバルーン電報・バルーンギフトの通販サイト。東京都心への即日配送対応。',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </AuthProvider>
      </body>
    </html>
  )
}
