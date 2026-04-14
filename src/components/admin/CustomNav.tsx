'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useTheme, Link } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'ub-nav-open-sections'

// ============================================================
// Theme
// ============================================================
const THEMES = {
  light: {
    sidebarBg: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    accent: '#6366f1',
    accentBg: 'rgba(99,102,241,0.06)',
    surfaceHover: '#f8fafc',
    borderLight: '#f1f5f9',
    danger: '#ef4444',
  },
  dark: {
    sidebarBg: '#1e293b',
    border: '#334155',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#818cf8',
    accentBg: 'rgba(129,140,248,0.1)',
    surfaceHover: '#334155',
    borderLight: '#293548',
    danger: '#f87171',
  },
} as const

// ============================================================
// SVG Icons
// ============================================================
const I = {
  grid: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  bag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  tag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
  award: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  gear: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  media: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  chevron: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  calendar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  database: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a9 2 0 019 2v16a9 2 0 01-18 0V4a9 2 0 019-2z"/><ellipse cx="12" cy="4" rx="9" ry="2"/><path d="M3 12a9 2 0 0018 0"/></svg>,
}

// ============================================================
// Nav structure with sub-items
// ============================================================
interface SubItem {
  label: string
  href: string
}

interface NavGroup {
  label: string
  icon: React.ReactNode
  href: string          // primary link (first click goes here)
  badge?: number
  children?: SubItem[]  // expandable sub-items
}

const SETTINGS_CHILDREN: SubItem[] = [
  { label: 'アカウント設定', href: '/admin/account' },
  { label: 'サイト設定', href: '/admin/globals/site-settings' },
]

function buildNav(pendingCount: number): NavGroup[] {
  return [
    { label: '概要', icon: I.grid, href: '/admin' },
    {
      label: '注文管理', icon: I.bag, href: '/admin/collections/orders',
      badge: pendingCount > 0 ? pendingCount : undefined,
      children: [
        { label: '注文一覧', href: '/admin/collections/orders' },
        { label: '変更履歴', href: '/admin/collections/order-audit-logs' },
        { label: '定期便プラン', href: '/admin/collections/subscription-plans' },
        { label: '定期便契約', href: '/admin/collections/subscriptions' },
      ],
    },
    { label: '商品', icon: I.tag, href: '/admin/collections/products' },
    {
      label: '顧客', icon: I.users, href: '/admin/collections/users',
      children: [
        { label: 'ユーザー一覧', href: '/admin/collections/users' },
        { label: 'ポイント履歴', href: '/admin/collections/point-transactions' },
      ],
    },
    {
      label: 'サイト管理', icon: I.edit, href: '/admin/collections/pages',
      children: [
        { label: '固定ページ', href: '/admin/collections/pages' },
        { label: 'ブログ記事', href: '/admin/collections/posts' },
        { label: 'フォーム', href: '/admin/collections/forms' },
        { label: 'お問い合わせ受信', href: '/admin/collections/form-submissions' },
        { label: 'メールテンプレート', href: '/admin/collections/email-templates' },
      ],
    },
    {
      label: '販促', icon: I.award, href: '/admin/collections/promotions',
      children: [
        { label: 'クーポン・割引', href: '/admin/collections/promotions' },
        { label: 'シークレットセール', href: '/admin/collections/secret-sales' },
        { label: 'A/Bテスト', href: '/admin/collections/ab-tests' },
      ],
    },
    {
      label: 'メルマガ', icon: I.mail, href: '/admin/collections/newsletters',
      children: [
        { label: 'メルマガ配信', href: '/admin/collections/newsletters' },
        { label: '購読者', href: '/admin/collections/newsletter-subscribers' },
      ],
    },
    { label: '営業カレンダー', icon: I.calendar, href: '/admin/collections/business-calendar' },
    { label: 'データ管理', icon: I.database, href: '/admin/data-management' },
  ]
}

// ============================================================
// Component
// ============================================================
export default function CustomNav() {
  const { theme } = useTheme()
  const themeKey = (theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark'
  const t = THEMES[themeKey]

  const [hoveredIdx, setHoveredIdx] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [stripeMode, setStripeMode] = useState<'test' | 'live'>('test')
  const pathname = usePathname() ?? '/admin'

  // Responsive: detect narrow viewport (< 1024px) — covers tablet + mobile
  const [isNarrow, setIsNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // Sync with Payload's built-in hamburger toggle — watches .app-header--nav-open class
  const [isNavOpen, setIsNavOpen] = useState(true)
  useEffect(() => {
    const appHeader = document.querySelector('.app-header')
    if (!appHeader) return

    const updateOpen = () => setIsNavOpen(appHeader.classList.contains('app-header--nav-open'))
    updateOpen()

    const observer = new MutationObserver(updateOpen)
    observer.observe(appHeader, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Close nav when clicking a link on narrow viewport (requires triggering Payload's toggler)
  const closeNavOnNarrow = useCallback(() => {
    if (!isNarrow) return
    const toggler = document.querySelector<HTMLButtonElement>('.nav-toggler')
    if (toggler && document.querySelector('.app-header--nav-open')) {
      toggler.click()
    }
  }, [isNarrow])

  // Restore open sections from localStorage + auto-expand active group
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set<string>()
    } catch { return new Set<string>() }
  })

  // Persist open sections to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...openGroups])) } catch {}
  }, [openGroups])

  // Fetch pending count
  useEffect(() => {
    fetch('/api/admin/dashboard?period=today', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.summary?.pendingCount != null) setPendingCount(data.summary.pendingCount) })
      .catch(() => {})
  }, [])

  // Fetch Stripe mode for badge
  useEffect(() => {
    fetch('/api/admin/stripe-mode', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.mode) setStripeMode(data.mode) })
      .catch(() => {})
  }, [])

  // Auto-expand the group containing the active page (additive, never closes others)
  useEffect(() => {
    const nav = buildNav(pendingCount)
    for (const group of nav) {
      if (group.children?.some(c => pathname.startsWith(c.href))) {
        setOpenGroups(prev => {
          if (prev.has(group.label)) return prev
          return new Set(prev).add(group.label)
        })
      }
    }
    // Auto-expand settings group if on an account or site-settings page
    if (SETTINGS_CHILDREN.some(c => pathname.startsWith(c.href))) {
      setOpenGroups(prev => {
        if (prev.has('設定')) return prev
        return new Set(prev).add('設定')
      })
    }
  }, [pathname, pendingCount])

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }, [])

  const navItems = buildNav(pendingCount)

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/'
    return pathname.startsWith(href)
  }

  const isGroupActive = (group: NavGroup) => {
    if (isActive(group.href)) return true
    return group.children?.some(c => isActive(c.href)) ?? false
  }

  // Desktop (≥1024px): sticky
  // Narrow (<1024px): fixed overlay, slides in/out based on Payload's nav-open state
  const navStyle: React.CSSProperties = isNarrow
    ? {
        width: 260,
        flexShrink: 0,
        background: t.sidebarBg,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        overflowY: 'auto',
        fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
        transform: isNavOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease, background .3s, border-color .3s',
        zIndex: 100,
        boxShadow: isNavOpen ? '0 10px 40px rgba(0,0,0,0.2)' : 'none',
      }
    : {
        width: 220,
        flexShrink: 0,
        background: t.sidebarBg,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px',
        transition: 'background .3s, border-color .3s',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        fontFamily: "'Noto Sans JP', -apple-system, sans-serif",
      }

  return (
    <>
      {/* Override Payload's fixed 220px grid column on mobile — the <nav> is position: fixed
          on mobile, so the grid column should collapse to let content fill the viewport.
          Payload uses [data-theme] .template-default { grid-template-columns: 220px 1fr !important }
          as an unlayered rule, so we must match/exceed specificity and use !important. */}
      <style>{`
        /* Payload 内蔵の両方のハンバーガーを常時非表示にする（自前を使用） */
        [data-theme] .template-default__nav-toggler-wrapper,
        [data-theme] .app-header__mobile-nav-toggler {
          display: none !important;
        }
        @media (max-width: 1023px) {
          [data-theme] .template-default,
          [data-theme] .template-default.template-default--nav-hydrated,
          [data-theme] .template-default.template-default--nav-open,
          [data-theme] .template-default.template-default--nav-animate {
            grid-template-columns: 1fr !important;
          }
          .template-default > nav {
            grid-column: 1 / -1;
          }
          /* Narrow 時は左上に自前ハンバーガー FAB (top:12, height:40 = ~52px) が fixed で乗るため、
             コンテンツ領域の上端を押し下げてタイトル等と重ならないようにする。
             Payload のデフォルトルールに勝つために !important + 高特異度セレクタを使う */
          [data-theme] .template-default .template-default__wrap {
            padding-top: 56px !important;
          }
          /* ページネーションを中央揃え + 折り返し対応 */
          [data-theme] .page-controls {
            justify-content: center !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
          }
        }
        /* モバイル (<768px): 左右パディングを 4% に詰めてコンテンツ幅を広げる */
        @media (max-width: 767px) {
          [data-theme="light"] .template-default__wrap,
          [data-theme="dark"] .template-default__wrap {
            padding-left: 4% !important;
            padding-right: 4% !important;
          }
        }
      `}</style>
      {/* 自前ハンバーガー (narrow 時、nav が閉じている時のみ表示) */}
      {isNarrow && !isNavOpen && (
        <button
          type="button"
          aria-label="メニューを開く"
          onClick={() => {
            document.querySelector<HTMLButtonElement>('.nav-toggler')?.click()
          }}
          onMouseEnter={() => setHoveredIdx('hamburger-btn')}
          onMouseLeave={() => setHoveredIdx(null)}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 101,
            width: 40,
            height: 40,
            borderRadius: 10,
            background: hoveredIdx === 'hamburger-btn' ? t.surfaceHover : t.sidebarBg,
            border: `1px solid ${t.border}`,
            color: t.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'background .15s',
            padding: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>
          </svg>
        </button>
      )}
      {/* Backdrop — only on narrow viewport when nav is open */}
      {isNarrow && isNavOpen && (
        <div
          onClick={closeNavOnNarrow}
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
            transition: 'opacity .25s ease',
          }}
        />
      )}
      <nav aria-label="主ナビゲーション" style={navStyle}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', marginBottom: stripeMode === 'test' ? 10 : 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>UB</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: -0.3, color: t.text }}>U BALLOON</div>
            <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>管理画面</div>
          </div>
        </div>
        {isNarrow && (
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={closeNavOnNarrow}
            onMouseEnter={() => setHoveredIdx('close-btn')}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: `1px solid ${t.borderLight}`,
              background: hoveredIdx === 'close-btn' ? t.surfaceHover : 'transparent',
              color: hoveredIdx === 'close-btn' ? t.text : t.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .15s, color .15s',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Stripe test mode badge — shown only when not in production */}
      {stripeMode === 'test' && (
        <div style={{
          margin: '0 12px 22px',
          padding: '5px 10px',
          borderRadius: 7,
          background: themeKey === 'dark' ? '#451a03' : '#fef3c7',
          border: `1px solid ${themeKey === 'dark' ? '#92400e' : '#f59e0b'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          color: themeKey === 'dark' ? '#fcd34d' : '#92400e',
        }}>
          <span>⚠</span>
          <span>Stripe テスト中</span>
        </div>
      )}

      {/* Nav groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {navItems.map((group) => {
          const hasChildren = group.children && group.children.length > 0
          const isOpen = openGroups.has(group.label)
          const groupActive = isGroupActive(group)
          const hoverKey = `g-${group.label}`
          const isHovered = hoveredIdx === hoverKey

          const headerStyle: React.CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            background: groupActive ? t.accentBg : isHovered ? t.surfaceHover : 'transparent',
            color: groupActive ? t.accent : t.textSecondary,
            fontWeight: groupActive ? 600 : 500,
            fontSize: 13.5, transition: 'all .15s',
            textDecoration: 'none', userSelect: 'none',
          }

          const headerContent = (
            <>
              {group.icon}
              <span style={{ flex: 1 }}>{group.label}</span>
              {group.badge != null && (
                <span style={{
                  background: t.danger, color: 'white',
                  fontSize: 10, fontWeight: 700, borderRadius: 10,
                  padding: '2px 7px', lineHeight: '1.2',
                }}>{group.badge}</span>
              )}
              {hasChildren && (
                <span style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform .2s', display: 'flex',
                  color: t.textMuted, flexShrink: 0,
                }}>{I.chevron}</span>
              )}
            </>
          )

          return (
            <div key={group.label}>
              {/* Group header — Link for leaf items, div for expandable groups */}
              {hasChildren ? (
                <div
                  onMouseEnter={() => setHoveredIdx(hoverKey)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={headerStyle}
                  onClick={() => toggleGroup(group.label)}
                >{headerContent}</div>
              ) : (
                <Link
                  href={group.href}
                  onMouseEnter={() => setHoveredIdx(hoverKey)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={headerStyle}
                >{headerContent}</Link>
              )}

              {/* Sub-items with animation */}
              {hasChildren && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 0,
                  paddingLeft: 36, marginTop: 2, marginBottom: isOpen ? 4 : 0,
                  maxHeight: isOpen ? `${group.children!.length * 36 + 8}px` : '0px',
                  overflow: 'hidden',
                  opacity: isOpen ? 1 : 0,
                  transition: 'max-height .25s ease, opacity .2s ease, margin-bottom .25s ease',
                }}>
                  {group.children!.map((child) => {
                    const childActive = isActive(child.href)
                    const childHoverKey = `c-${child.href}`
                    const childHovered = hoveredIdx === childHoverKey
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onMouseEnter={() => setHoveredIdx(childHoverKey)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px', borderRadius: 8,
                          fontSize: 12.5, fontWeight: childActive ? 600 : 400,
                          color: childActive ? t.accent : t.textMuted,
                          background: childActive ? t.accentBg : childHovered ? t.surfaceHover : 'transparent',
                          textDecoration: 'none', transition: 'all .12s',
                        }}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom: settings (collapsible) */}
      {(() => {
        const settingsOpen = openGroups.has('設定')
        const settingsActive = SETTINGS_CHILDREN.some(c => isActive(c.href))
        const hoverKey = 'g-設定'
        const isHovered = hoveredIdx === hoverKey
        return (
          <div style={{ marginTop: 'auto', borderTop: `1px solid ${t.borderLight}`, paddingTop: 8 }}>
            {/* Header */}
            <div
              onMouseEnter={() => setHoveredIdx(hoverKey)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => toggleGroup('設定')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: settingsActive ? t.accentBg : isHovered ? t.surfaceHover : 'transparent',
                color: settingsActive ? t.accent : t.textSecondary,
                fontWeight: settingsActive ? 600 : 500,
                fontSize: 13.5, transition: 'all .15s', userSelect: 'none',
              }}
            >
              {I.gear}
              <span style={{ flex: 1 }}>設定</span>
              <span style={{
                transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform .2s', display: 'flex',
                color: t.textMuted, flexShrink: 0,
              }}>{I.chevron}</span>
            </div>

            {/* Sub-items */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 0,
              paddingLeft: 36, marginTop: 2,
              marginBottom: settingsOpen ? 4 : 0,
              maxHeight: settingsOpen ? `${SETTINGS_CHILDREN.length * 36 + 8}px` : '0px',
              overflow: 'hidden',
              opacity: settingsOpen ? 1 : 0,
              transition: 'max-height .25s ease, opacity .2s ease, margin-bottom .25s ease',
            }}>
              {SETTINGS_CHILDREN.map((child) => {
                const childActive = isActive(child.href)
                const childHoverKey = `c-${child.href}`
                const childHovered = hoveredIdx === childHoverKey
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onMouseEnter={() => setHoveredIdx(childHoverKey)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 8,
                      fontSize: 12.5, fontWeight: childActive ? 600 : 400,
                      color: childActive ? t.accent : t.textMuted,
                      background: childActive ? t.accentBg : childHovered ? t.surfaceHover : 'transparent',
                      textDecoration: 'none', transition: 'all .12s',
                    }}
                  >
                    {child.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}
    </nav>
    </>
  )
}
