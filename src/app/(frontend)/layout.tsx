import React from 'react'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { getPayload } from 'payload'
import config from '@payload-config'
import { AuthProvider } from '@/lib/auth-context'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CartDrawer } from '@/components/CartDrawer'
import { GoogleAnalytics } from '@/components/GoogleAnalytics'
import { getBrand } from '@/lib/brand'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
})

import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/site-settings'
import { FALLBACK_BRAND } from '@/lib/brand'

export async function generateMetadata(): Promise<Metadata> {
  let settings = null
  try {
    settings = await getSiteSettings()
  } catch {
    // DB columns may not be ready yet
  }
  const brandName = settings?.brandName || FALLBACK_BRAND.name
  const title = settings?.siteTitle || brandName
  const description = settings?.siteDescription || ''
  const ogImage = settings?.siteOgImageUrl
  return {
    title: {
      default: title,
      template: `%s | ${brandName}`,
    },
    description,
    openGraph: {
      title,
      description,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  // Fetch GA4 + brand info from SiteSettings (60-second cache via
  // getSiteSettings / getBrand). GA4 measurement ID is read directly from
  // payload because it is not yet exposed on getSiteSettings(), but brand
  // values go through the cached helper.
  let ga4Id: string | null = null
  let brandName = FALLBACK_BRAND.name
  let brandTagline = FALLBACK_BRAND.tagline
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'site-settings' })
    ga4Id = (settings?.ga4MeasurementId as string) || null
  } catch {
    // SiteSettings not yet initialized — fall back to env var
  }
  try {
    const brand = await getBrand()
    brandName = brand.name
    brandTagline = brand.tagline
  } catch {
    // SiteSettings unavailable — keep static fallbacks
  }

  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="flex min-h-screen flex-col">
        <GoogleAnalytics ga4Id={ga4Id} />
        <AuthProvider>
          <Header brandName={brandName} brandTagline={brandTagline} />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </AuthProvider>
      </body>
    </html>
  )
}
