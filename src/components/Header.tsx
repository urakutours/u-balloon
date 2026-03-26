'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { useCartStore } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ShoppingCart, Menu, User, Search, ChevronRight, ChevronDown, LogOut, Coins } from 'lucide-react'
import { useCartDrawer } from '@/components/CartDrawer'
import { useSearchDialog, SearchDialog } from '@/components/SearchDialog'

// ─── Shopifyメインメニュー構造（5項目） ───

const SCENE_MENU = {
  label: 'シーンで選ぶ',
  items: [
    { label: '誕生日', tag: '誕生日' },
    { label: '1才の誕生日', tag: '1才の誕生日' },
    { label: '結婚式', tag: '結婚' },
    { label: '出産祝い', tag: '出産' },
    { label: 'お見舞い', tag: 'お見舞い' },
    { label: '発表会', tag: '発表会' },
    { label: '還暦祝い', tag: '還暦' },
    { label: 'オールマイティ', tag: 'オールマイティ' },
    { label: 'クリスマス', tag: 'クリスマス' },
    { label: '母の日', tag: '母の日' },
    { label: '開店・周年・移転', tag: '開店・周年・移転' },
  ],
}

const TYPE_MENU = {
  label: 'タイプで選ぶ',
  items: [
    { label: 'ラッピング', tag: 'ラッピング' },
    { label: '置き型', tag: '置き型' },
    { label: 'フリンジ', tag: 'フリンジ' },
    { label: 'スパーク', tag: 'スパーク' },
    { label: 'オプション', tag: 'オプション' },
  ],
}

const DELIVERY_MENU = {
  label: 'バルーンデリバリー',
  items: [
    { label: 'バルーンリリース', tag: 'リリース' },
  ],
}

export function Header() {
  const { user, isLoading, logout } = useAuth()
  const itemCountRaw = useCartStore((s) => s.getItemCount())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const openCartDrawer = useCartDrawer((s) => s.open)
  const openSearch = useSearchDialog((s) => s.open)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const itemCount = mounted ? itemCountRaw : 0

  // Scroll behavior: hide on scroll down, show compact on scroll up
  const [headerState, setHeaderState] = useState<'full' | 'hidden' | 'compact'>('full')
  const lastScrollY = useRef(0)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const threshold = 80 // px scrolled before hiding

    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY <= 10) {
        // At the top — show full header
        setHeaderState('full')
      } else if (currentY > lastScrollY.current && currentY > threshold) {
        // Scrolling down — hide
        setHeaderState('hidden')
      } else if (currentY < lastScrollY.current) {
        // Scrolling up — show compact
        setHeaderState('compact')
      }
      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isCompact = headerState === 'compact'
  const isHidden = headerState === 'hidden'

  return (
    <>
      {/* SEO text — visually hidden, accessible to search engines */}
      <p className="sr-only">
        u-balloon（ユーバルーン）｜特別な日にバルーンを！ギフトやウェディング、大規模な装飾まで、何でもご相談ください
      </p>

      {/* Main Header — Shopify layout: search(left) / logo(center-large) / account+cart(right) */}
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 border-b border-border/60 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 transition-transform duration-300 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Upper row: 3-column layout */}
          <div className={`grid grid-cols-3 items-center transition-[padding] duration-300 ${isCompact ? 'py-1.5' : 'py-3 lg:py-5'}`}>
            {/* Left: hamburger(mobile) / search(desktop) */}
            <div className="flex items-center">
              {/* Mobile hamburger */}
              <div className="lg:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger
                    render={<button type="button" className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground" />}
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">メニュー</span>
                  </SheetTrigger>
                  <MobileMenu
                    user={user}
                    isLoading={isLoading}
                    logout={logout}
                    itemCount={itemCount}
                    onClose={() => setMobileMenuOpen(false)}
                  />
                </Sheet>
              </div>
              {/* Desktop search */}
              <button
                type="button"
                className="hidden h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground lg:flex"
                onClick={openSearch}
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">検索</span>
              </button>
            </div>

            {/* Center: Logo (large) — percentage-based with max-width */}
            <div className="flex justify-center overflow-visible">
              <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
                <Image
                  src="/logo.svg"
                  alt="uballoon"
                  width={480}
                  height={133}
                  className={`w-[60vw] max-w-[220px] sm:w-[45vw] sm:max-w-[280px] md:max-w-[360px] lg:w-[35vw] lg:max-w-[480px] h-auto transition-all duration-300 ${isCompact ? '!max-w-[160px] sm:!max-w-[200px] md:!max-w-[240px] lg:!max-w-[280px]' : ''}`}
                  priority
                />
              </Link>
            </div>

            {/* Right: search(mobile) + account + cart */}
            <div className="flex items-center justify-end gap-1">
              {/* Mobile search */}
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground lg:hidden"
                onClick={openSearch}
              >
                <Search className="h-5 w-5" />
                <span className="sr-only">検索</span>
              </button>

              {/* Account */}
              <div className="hidden lg:block">
                {isLoading ? null : user ? (
                  <Link href="/account">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">マイページ</span>
                    </button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <User className="h-5 w-5" />
                      <span className="sr-only">ログイン</span>
                    </button>
                  </Link>
                )}
              </div>

              {/* Cart */}
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                onClick={openCartDrawer}
                suppressHydrationWarning
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand-pink text-[10px] font-bold text-white"
                    suppressHydrationWarning
                  >
                    {itemCount}
                  </span>
                )}
                <span className="sr-only" suppressHydrationWarning>カート</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <DesktopNav />
        </div>
      </header>

      <SearchDialog />
    </>
  )
}

// ─── Desktop Navigation ───

function DesktopNav() {
  return (
    <nav className="hidden border-t border-border/40 lg:block">
      <ul className="flex items-center justify-center gap-0.5 py-1">
        <DropdownMenu menu={SCENE_MENU} />
        <DropdownMenu menu={TYPE_MENU} />
        <NavLink href="/products?tag=カスタマイズ">カスタマイズ（プリフィクス）</NavLink>
        <DropdownMenu menu={DELIVERY_MENU} />
        <NavLink href="/contact">お問い合わせ</NavLink>
      </ul>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-brand-dark"
      >
        {children}
      </Link>
    </li>
  )
}

function DropdownMenu({ menu }: { menu: { label: string; items: { label: string; tag: string }[] } }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleEnter = () => {
    clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  return (
    <li ref={ref} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-brand-dark"
        onClick={() => setOpen(!open)}
      >
        {menu.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-1">
          <div className="overflow-hidden rounded-lg border border-border/60 bg-white shadow-lg">
            <div className="py-1">
              {menu.items.map((item) => (
                <Link
                  key={item.tag}
                  href={`/products?tag=${encodeURIComponent(item.tag)}`}
                  className="block px-4 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-brand-pink-light hover:text-brand-dark"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

// ─── Mobile Menu (Sheet) ───

function MobileMenu({
  user,
  isLoading,
  logout,
  itemCount,
  onClose,
}: {
  user: ReturnType<typeof useAuth>['user']
  isLoading: boolean
  logout: () => Promise<void>
  itemCount: number
  onClose: () => void
}) {
  const [sceneOpen, setSceneOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)

  return (
    <SheetContent side="left" className="w-[300px] p-0">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="text-left">
          <Image src="/logo.svg" alt="uballoon" width={120} height={34} className="h-8 w-auto" />
        </SheetTitle>
      </SheetHeader>

      <div className="flex h-[calc(100%-65px)] flex-col">
        {/* User info */}
        {!isLoading && user && (
          <div className="border-b bg-brand-pink-light/50 px-5 py-4">
            <p className="text-sm font-medium text-foreground">
              {user.name || user.email}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-brand-pink" />
              <span className="text-sm font-bold text-brand-pink">
                {(user.points ?? 0).toLocaleString()} pt
              </span>
              <span className="text-xs text-muted-foreground">保有ポイント</span>
            </div>
          </div>
        )}

        {/* Navigation — matches Shopify 5-item structure */}
        <nav className="flex-1 overflow-y-auto py-2">
          {/* シーンで選ぶ */}
          <MobileAccordion
            label={SCENE_MENU.label}
            open={sceneOpen}
            onToggle={() => setSceneOpen(!sceneOpen)}
          >
            {SCENE_MENU.items.map((item) => (
              <MobileSubLink
                key={item.tag}
                href={`/products?tag=${encodeURIComponent(item.tag)}`}
                onClick={onClose}
              >
                {item.label}
              </MobileSubLink>
            ))}
          </MobileAccordion>

          {/* タイプで選ぶ */}
          <MobileAccordion
            label={TYPE_MENU.label}
            open={typeOpen}
            onToggle={() => setTypeOpen(!typeOpen)}
          >
            {TYPE_MENU.items.map((item) => (
              <MobileSubLink
                key={item.tag}
                href={`/products?tag=${encodeURIComponent(item.tag)}`}
                onClick={onClose}
              >
                {item.label}
              </MobileSubLink>
            ))}
          </MobileAccordion>

          {/* カスタマイズ（プリフィクス） */}
          <MobileNavLink href="/products?tag=カスタマイズ" onClick={onClose}>
            カスタマイズ（プリフィクス）
          </MobileNavLink>

          {/* バルーンデリバリー */}
          <MobileAccordion
            label={DELIVERY_MENU.label}
            open={deliveryOpen}
            onToggle={() => setDeliveryOpen(!deliveryOpen)}
          >
            {DELIVERY_MENU.items.map((item) => (
              <MobileSubLink
                key={item.tag}
                href={`/products?tag=${encodeURIComponent(item.tag)}`}
                onClick={onClose}
              >
                {item.label}
              </MobileSubLink>
            ))}
          </MobileAccordion>

          {/* お問い合わせ */}
          <MobileNavLink href="/contact" onClick={onClose}>
            お問い合わせ
          </MobileNavLink>

          <div className="my-2 border-t" />

          <MobileNavLink href="/cart" onClick={onClose}>
            カート
            {itemCount > 0 && (
              <span className="ml-auto rounded-full bg-brand-pink px-2 py-0.5 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </MobileNavLink>

          {!isLoading && user && (
            <MobileNavLink href="/account" onClick={onClose}>
              マイページ
            </MobileNavLink>
          )}
        </nav>

        {/* Bottom: Auth */}
        <div className="border-t px-5 py-4">
          {!isLoading && user ? (
            <Button
              variant="outline"
              className="w-full gap-2 text-foreground/70"
              onClick={async () => {
                onClose()
                await logout()
                window.location.href = '/'
              }}
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          ) : (
            <div className="space-y-2">
              <Link href="/login" className="block" onClick={onClose}>
                <Button variant="outline" className="w-full">
                  ログイン
                </Button>
              </Link>
              <Link href="/register" className="block" onClick={onClose}>
                <Button className="w-full bg-brand-dark hover:bg-brand-dark/90">
                  会員登録
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </SheetContent>
  )
}

// ─── Mobile Menu Components ───

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
      onClick={onClick}
    >
      <span className="flex flex-1 items-center">{children}</span>
      <ChevronRight className="h-4 w-4 text-foreground/30" />
    </Link>
  )
}

function MobileAccordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-5 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
        onClick={onToggle}
      >
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={`h-4 w-4 text-foreground/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="bg-muted/30">
          {children}
        </div>
      )}
    </div>
  )
}

function MobileSubLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      className="flex items-center px-5 py-2.5 pl-9 text-sm text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </Link>
  )
}
