'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { isGaEnabled, pageview } from '@/lib/gtag'

/**
 * GA4 measurement ID is sourced exclusively from SiteSettings
 * (passed as ga4Id prop from the server-side layout).
 * Configure via: 管理画面 > サイト設定 > GA4 測定ID
 */

function GAPageTracker({ ga4Id }: { ga4Id: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ga4Id) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    pageview(url)
  }, [pathname, searchParams, ga4Id])

  return null
}

interface GoogleAnalyticsProps {
  /** GA4 Measurement ID from SiteSettings (server-side). No-op if omitted or empty. */
  ga4Id?: string | null
}

export function GoogleAnalytics({ ga4Id: propId }: GoogleAnalyticsProps) {
  // GA4 ID is sourced exclusively from SiteSettings (server-side global)
  const ga4Id = propId || ''

  if (!ga4Id || !/^G-[A-Z0-9]+$/.test(ga4Id)) return null

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga4Id}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <GAPageTracker ga4Id={ga4Id} />
      </Suspense>
    </>
  )
}
