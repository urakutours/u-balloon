import React from 'react'
import Link from 'next/link'
import { getSiteSettings } from '@/lib/site-settings'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  )
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

export async function Footer() {
  let settings: Awaited<ReturnType<typeof getSiteSettings>> | null = null
  try {
    settings = await getSiteSettings()
  } catch {
    // DB columns may not exist yet (e.g. first deploy after migration)
  }

  const allLinks = [
    settings?.snsInstagramUrl ? { url: settings.snsInstagramUrl, label: 'Instagram', icon: <InstagramIcon className="h-5 w-5" /> } : null,
    settings?.snsLineUrl ? { url: settings.snsLineUrl, label: 'LINE', icon: <LineIcon className="h-4.5 w-4.5" /> } : null,
    settings?.snsXUrl ? { url: settings.snsXUrl, label: 'X', icon: <XIcon className="h-4.5 w-4.5" /> } : null,
    settings?.snsFacebookUrl ? { url: settings.snsFacebookUrl, label: 'Facebook', icon: <FacebookIcon className="h-5 w-5" /> } : null,
    settings?.snsTiktokUrl ? { url: settings.snsTiktokUrl, label: 'TikTok', icon: <TikTokIcon className="h-5 w-5" /> } : null,
    settings?.snsYoutubeUrl ? { url: settings.snsYoutubeUrl, label: 'YouTube', icon: <YouTubeIcon className="h-5 w-5" /> } : null,
  ]
  const snsLinks = allLinks.filter(Boolean) as { url: string; label: string; icon: React.JSX.Element }[]

  return (
    <footer className="mt-auto bg-brand-teal text-white/90">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Navigation links — single row like Shopify */}
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <Link href="/about" className="text-sm transition-colors hover:text-white">
            会社概要
          </Link>
          <Link href="/legal" className="text-sm transition-colors hover:text-white">
            特定商取引法に基づく表示
          </Link>
          <Link href="/privacy" className="text-sm transition-colors hover:text-white">
            プライバシーポリシー
          </Link>
          <Link href="/delivery" className="text-sm transition-colors hover:text-white">
            ご利用ガイド
          </Link>
          <Link href="/contact" className="text-sm transition-colors hover:text-white">
            お問い合わせ
          </Link>
        </nav>

        {/* Social Icons */}
        {snsLinks.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {snsLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label={link.label}
              >
                {link.icon}
              </a>
            ))}
          </div>
        )}

        {/* Copyright — owner name from SiteSettings (admin GUI), per-instance.
            Year is computed in JST so SSR (UTC) and CSR don't drift over the
            year boundary. Footer is a Server Component so the year is rendered
            once at request time. */}
        <div className="mt-8 border-t border-white/20 pt-6">
          <p className="text-center text-xs text-white/60">
            &copy; {(() => {
              const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
              return jstNow.getUTCFullYear()
            })()} {settings?.companyName || settings?.siteTitle || ''}
          </p>
        </div>
      </div>
    </footer>
  )
}
