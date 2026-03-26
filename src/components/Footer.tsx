import React from 'react'
import Link from 'next/link'

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

export function Footer() {
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
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="https://www.instagram.com/uballoon_tokyo/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Instagram"
          >
            <InstagramIcon className="h-5 w-5" />
          </a>
          <a
            href="https://line.me/R/ti/p/@uballoon"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="LINE"
          >
            <LineIcon className="h-4.5 w-4.5" />
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-white/20 pt-6">
          <p className="text-center text-xs text-white/60">
            &copy; 2026 UBALLOON（バルーンギフトのユーバルーン）
          </p>
        </div>
      </div>
    </footer>
  )
}
