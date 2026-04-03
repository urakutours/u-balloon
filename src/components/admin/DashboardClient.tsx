'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useTheme } from '@payloadcms/ui'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

// ============================================================
// Theme definitions (ec-dashboard-v2 palette)
// ============================================================
const THEMES = {
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f8fafc',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    accent: '#6366f1',
    accentLight: '#818cf8',
    accentBg: 'rgba(99,102,241,0.06)',
    purple: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    cardShadow: '0 1px 3px rgba(0,0,0,0.04)',
    kpiGradient: 'linear-gradient(135deg, #6366f1, #7c3aed)',
    barDefault: 'linear-gradient(180deg, #e2e8f0, #cbd5e1)',
    barActive: 'linear-gradient(180deg, #6366f1, #818cf8)',
    tabBg: '#f1f5f9',
    tabActive: '#ffffff',
    tabShadow: '0 1px 3px rgba(0,0,0,0.08)',
    toggleBg: '#f1f5f9',
    toggleIcon: '#64748b',
  },
  dark: {
    bg: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    border: '#334155',
    borderLight: '#293548',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#818cf8',
    accentLight: '#a5b4fc',
    accentBg: 'rgba(129,140,248,0.1)',
    purple: '#a78bfa',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    cardShadow: '0 1px 3px rgba(0,0,0,0.3)',
    kpiGradient: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
    barDefault: 'linear-gradient(180deg, #334155, #475569)',
    barActive: 'linear-gradient(180deg, #818cf8, #a5b4fc)',
    tabBg: '#1e293b',
    tabActive: '#334155',
    tabShadow: '0 1px 3px rgba(0,0,0,0.3)',
    toggleBg: '#334155',
    toggleIcon: '#e2e8f0',
  },
} as const

type T = (typeof THEMES)[ThemeKey]

// ============================================================
// Status config
// ============================================================
const STATUS_LABELS: Record<string, string> = {
  pending: '保留中',
  awaiting_payment: '入金待ち',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

const STATUS_COLORS = {
  light: {
    pending: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
    awaiting_payment: { bg: '#fce7f3', text: '#9d174d', dot: '#ec4899' },
    confirmed: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
    preparing: { bg: '#e0e7ff', text: '#3730a3', dot: '#6366f1' },
    shipped: { bg: '#d1fae5', text: '#065f46', dot: '#10b981' },
    delivered: { bg: '#f0fdf4', text: '#166534', dot: '#22c55e' },
    cancelled: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
  },
  dark: {
    pending: { bg: 'rgba(245,158,11,0.2)', text: '#fcd34d', dot: '#fbbf24' },
    awaiting_payment: { bg: 'rgba(236,72,153,0.2)', text: '#f9a8d4', dot: '#f472b6' },
    confirmed: { bg: 'rgba(59,130,246,0.2)', text: '#93c5fd', dot: '#60a5fa' },
    preparing: { bg: 'rgba(99,102,241,0.2)', text: '#a5b4fc', dot: '#818cf8' },
    shipped: { bg: 'rgba(16,185,129,0.2)', text: '#6ee7b7', dot: '#34d399' },
    delivered: { bg: 'rgba(34,197,94,0.15)', text: '#86efac', dot: '#4ade80' },
    cancelled: { bg: 'rgba(239,68,68,0.2)', text: '#fca5a5', dot: '#f87171' },
  },
} as const

const DONUT_COLORS = ['#f59e0b', '#ec4899', '#3b82f6', '#6366f1', '#10b981', '#22c55e', '#ef4444']
const DONUT_KEYS = ['pending', 'awaiting_payment', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled']

// ============================================================
// Types
// ============================================================
type Period = 'today' | 'week' | 'month' | 'custom'
type ThemeKey = 'light' | 'dark'

const PERIOD_LABELS: Record<Period, string> = {
  today: '本日',
  week: '今週',
  month: '今月',
  custom: 'カスタム',
}

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
  night: '夜',
  unspecified: '未指定',
}

export interface DashboardData {
  summary: {
    orderCount: number
    revenue: number
    pendingCount: number
    newUserCount: number
    totalOrders: number
    todayDeliveryCount: number
    tomorrowDeliveryCount: number
  }
  comparison?: {
    prevRevenue: number
    prevOrderCount: number
    revenueChangeRate: number | null
    orderChangeRate: number | null
    label: string // '前日比' | '前週比' | '前月比' | '前期比'
  }
  dailyTrend: Array<{ date: string; orders: number; revenue: number }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    totalAmount: number
    status: string
    createdAt: string
  }>
  statusCounts: Record<string, number>
  deliverySlotCounts: Record<string, number>
  upcomingHolidays: Array<{
    id: string
    date: string
    isHoliday: boolean
    shippingAvailable: boolean
    holidayReason: string
  }>
  lowStockProducts?: Array<{
    id: string
    title: string
    stock: number | null
    lowStockThreshold?: number | null
  }>
  topProducts?: Array<{
    name: string
    salesCount: number
    revenue: number
  }>
  quickStats?: {
    conversionRate: number | null
    avgOrderValue: number
    repeatRate: number
    avgLTV: number
    newMembersCount: number
  }
  siteTraffic?: {
    sessions: number | null
    totalUsers: number | null
    pageviews: number | null
    bounceRate: number | null
    avgSessionDuration: number | null
    pagesPerSession: number | null
    dailyChart: Array<{ date: string; sessions: number }> | null
  } | null
  conversionFunnel?: {
    sessions: number | null
    addToCarts: number | null
    purchases: number
  } | null
  customerInsights?: {
    repeatRate: number
    avgLTV: number
    avgOrderValue: number
    newMembersCount: number
    returningVisitorRate: number | null
  } | null
  period: { type: string; start: string; end: string }
}

// ============================================================
// SVG Icons
// ============================================================
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

// ============================================================
// Sub-components
// ============================================================

/** Card wrapper */
function Card({ t, style, children }: { t: T; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{
      background: t.surface, borderRadius: 16,
      border: `1px solid ${t.border}`, boxShadow: t.cardShadow,
      transition: 'all .3s', ...style,
    }}>{children}</div>
  )
}

/** Card header */
function CardHeader({ title, sub, right, t }: { title: string; sub?: string; right?: React.ReactNode; t: T }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: t.text }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: t.textMuted, margin: '2px 0 0' }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** Key metric mini-card (2×2 grid in 重要指標 section) */
function KeyMetricCard({ label, value, accent, t }: {
  label: string; value: string; accent?: boolean; t: T
}) {
  return (
    <div style={{
      background: accent ? t.accentBg : t.surface,
      borderRadius: 12, padding: '14px 16px',
      border: `1px solid ${t.border}`,
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 500, color: t.textMuted, marginBottom: 8, letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.5, color: accent ? t.accent : t.text }}>
        {value}
      </div>
    </div>
  )
}

/** KPI card */
function KpiCard({ label, value, sub, subColor, icon, t }: {
  label: string; value: string; sub: string; subColor?: string; icon: React.ReactNode; t: T
}) {
  return (
    <div style={{
      background: t.surface, borderRadius: 16, padding: '20px 22px',
      border: `1px solid ${t.border}`, boxShadow: t.cardShadow,
      transition: 'all .3s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: t.textMuted }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: t.accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{icon}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 4, color: t.text }}>{value}</div>
      <span style={{ fontSize: 11, fontWeight: 500, color: subColor ?? t.textMuted }}>{sub}</span>
    </div>
  )
}

/** Status badge */
function StatusBadge({ status, themeKey }: { status: string; themeKey: ThemeKey }) {
  const palette = STATUS_COLORS[themeKey]
  const c = palette[status as keyof typeof palette] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** Bar chart — 2-line labels, overflow-safe, label always centered under its bar */
interface BarItem {
  labelTop: string    // e.g. "30" or "4/1" or "1月"
  labelBottom: string // e.g. "月" (DOW) or "" for aggregated
  showLabel: boolean
  value: number
  isToday?: boolean   // highlight today's bar regardless of max value
}

function Bars({ data, t }: { data: BarItem[]; t: T }) {
  const n = data.length
  const max = Math.max(...data.map(d => d.value), 1)
  const compact = n > 14
  const gap = compact ? 1 : n > 7 ? 3 : 6
  const fontSize1 = compact ? 9 : 11
  const fontSize2 = compact ? 8 : 10
  const labelH = 26 // fixed height reserved for 2-line label area

  // Today's bar takes priority for highlight; fall back to max-value bar
  const anyToday = data.some(d => d.isToday)

  return (
    <div style={{ width: '100%', overflow: 'hidden', minWidth: 0 }}>
      {/* Bar area */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap, height: 110, width: '100%' }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 100
          const highlighted = anyToday ? !!d.isToday : (d.value === max && d.value > 0)
          return (
            <div key={i} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {!compact && (
                <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', marginBottom: 4 }}>
                  {d.value > 0 ? `${(d.value / 10000).toFixed(0)}万` : '—'}
                </span>
              )}
              <div style={{
                width: '100%', height: `${Math.max(h, 3)}%`, minHeight: 3,
                borderRadius: compact ? '3px 3px 1px 1px' : '6px 6px 3px 3px',
                background: highlighted ? t.barActive : t.barDefault,
                transition: 'height 0.6s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            </div>
          )
        })}
      </div>
      {/* Label area — same flex layout so labels align to bars */}
      <div style={{ display: 'flex', gap, height: labelH, marginTop: 6, width: '100%' }}>
        {data.map((d, i) => {
          const highlighted = anyToday ? !!d.isToday : (d.value === max && d.value > 0)
          return (
            <div key={i} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', overflow: 'hidden' }}>
              {d.showLabel && (
                <>
                  <div style={{ fontSize: fontSize1, fontWeight: highlighted ? 700 : 500, color: highlighted ? t.accent : t.textMuted, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {d.labelTop}
                  </div>
                  {d.labelBottom && (
                    <div style={{ fontSize: fontSize2, color: t.textMuted, lineHeight: 1.3 }}>
                      {d.labelBottom}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Donut chart (from ec-dashboard-v2) */
function Donut({ data, t }: { data: Record<string, number>; t: T }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0)
  if (total === 0) {
    return <div style={{ textAlign: 'center', padding: 20, color: t.textMuted, fontSize: 13 }}>データなし</div>
  }
  let cum = 0
  const segs = DONUT_KEYS.map((key, i) => {
    const v = data[key] ?? 0
    const s = cum
    cum += v
    return { s, e: cum, c: DONUT_COLORS[i], l: STATUS_LABELS[key], v }
  }).filter(s => s.v > 0)

  const r = 44, cx = 55, cy = 55, rad = Math.PI / 180
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg viewBox="0 0 110 110" style={{ width: 110, height: 110, flexShrink: 0 }}>
        {segs.map((seg, i) => {
          const sa = (seg.s / total) * 360 - 90
          const ea = (seg.e / total) * 360 - 90
          const la = ea - sa > 180 ? 1 : 0
          return (
            <path
              key={i}
              d={`M ${cx + r * Math.cos(sa * rad)} ${cy + r * Math.sin(sa * rad)} A ${r} ${r} 0 ${la} 1 ${cx + r * Math.cos(ea * rad)} ${cy + r * Math.sin(ea * rad)}`}
              fill="none" stroke={seg.c} strokeWidth="12" strokeLinecap="round"
            />
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill={t.text}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={t.textMuted} fontWeight="500">全注文</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {segs.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.c, flexShrink: 0 }} />
            <span style={{ color: t.textSecondary, minWidth: 56 }}>{seg.l}</span>
            <span style={{ fontWeight: 700, color: t.text }}>{seg.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Mini SVG area sparkline */
function MiniAreaChart({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data, 1)
  const W = 100, H = 36
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - (v / max) * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const linePath = `M ${pts.join(' L ')}`
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`
  const gradId = `mg-${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 36, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Format seconds into Japanese human-readable string */
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}秒`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s > 0 ? `${m}分${s}秒` : `${m}分`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}時間${rem}分` : `${h}時間`
}

// ============================================================
// Main component
// ============================================================
export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const { theme, setTheme } = useTheme()
  const themeKey: ThemeKey = theme === 'dark' ? 'dark' : 'light'
  const t = THEMES[themeKey]

  const [period, setPeriod] = useState<Period>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [data, setData] = useState<DashboardData>(initialData)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (p: Period, start?: string, end?: string) => {
    // Cancel any in-flight request to prevent race conditions
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams({ period: p })
      if (p === 'custom' && start) params.set('start', start)
      if (p === 'custom' && end) params.set('end', end)
      const res = await fetch(`/api/admin/dashboard?${params}`, {
        credentials: 'include',
        signal: abortRef.current.signal,
      })
      if (res.ok) {
        setData(await res.json())
      } else {
        setFetchError(`データの取得に失敗しました（${res.status}）`)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return // intentional cancel
      console.error('Dashboard fetch error:', err)
      setFetchError('データを読み込めませんでした。ネットワーク接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (period !== 'week') fetchData(period, customStart, customEnd)
  }, [period, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (p === 'week') setData(initialData)
  }

  const yen = (n: number) => '¥' + n.toLocaleString()
  const periodLabel = period === 'custom' && customStart && customEnd
    ? `${customStart}〜${customEnd}`
    : PERIOD_LABELS[period]
  const today = new Date()

  // Custom date validation
  const todayStr = today.toISOString().split('T')[0]
  const customDateError = (() => {
    if (period !== 'custom') return null
    if (!customStart || !customEnd) return null
    if (customStart > customEnd) return '開始日は終了日より前に設定してください'
    if (customStart > todayStr) return '開始日に未来の日付は指定できません'
    return null
  })()

  // ---- Build bar chart data with 2-line labels ----
  const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']
  const numDays = data.dailyTrend.length

  function buildBarData(): BarItem[] {
    // Helper: detect month boundary for "week" style labels
    const buildDayItem = (d: { date: string; revenue: number }, idx: number, arr: typeof data.dailyTrend): BarItem => {
      const dt = new Date(d.date)
      const m = dt.getMonth() + 1
      const day = dt.getDate()
      const dow = DAY_NAMES[dt.getDay()]
      // Show M/ prefix only when month changes from previous entry
      const prevMonth = idx > 0 ? new Date(arr[idx - 1].date).getMonth() + 1 : m
      const showMonth = idx === 0 || m !== prevMonth
      return { labelTop: showMonth ? `${m}/${day}` : `${day}`, labelBottom: dow, showLabel: true, value: d.revenue, isToday: d.date === todayStr }
    }

    // === "today" ===
    if (period === 'today') {
      return data.dailyTrend.map(d => {
        const dt = new Date(d.date)
        return { labelTop: `${dt.getMonth() + 1}/${dt.getDate()}`, labelBottom: DAY_NAMES[dt.getDay()], showLabel: true, value: d.revenue, isToday: d.date === todayStr }
      })
    }

    // === "week": always show labels ===
    if (period === 'week') {
      return data.dailyTrend.map((d, i, arr) => buildDayItem(d, i, arr))
    }

    // === month / custom ≤62 days: thin labels; add M/ prefix on month boundary ===
    if (period === 'month' || (period === 'custom' && numDays <= 62 && numDays > 14)) {
      const SHOW_DAYS = new Set([1, 5, 10, 15, 20, 25])
      const lastIdx = data.dailyTrend.length - 1
      let prevShownMonth = -1
      return data.dailyTrend.map((d, i) => {
        const dt = new Date(d.date)
        const day = dt.getDate()
        const m = dt.getMonth() + 1
        const show = SHOW_DAYS.has(day) || i === lastIdx
        let labelTop = `${day}`
        if (show && m !== prevShownMonth) {
          labelTop = `${m}/${day}`
          prevShownMonth = m
        }
        return { labelTop, labelBottom: DAY_NAMES[dt.getDay()], showLabel: show, value: d.revenue, isToday: d.date === todayStr }
      })
    }

    // === custom ≤14 days: same as week (all labels, month prefix on boundary) ===
    if (period === 'custom' && numDays <= 14) {
      return data.dailyTrend.map((d, i, arr) => buildDayItem(d, i, arr))
    }

    // === custom 63–180 days: aggregate to weekly bars ===
    if (period === 'custom' && numDays > 62 && numDays <= 180) {
      const weeks: { weekStart: string; revenue: number }[] = []
      let weekRev = 0
      let weekSt = data.dailyTrend[0]?.date ?? ''
      data.dailyTrend.forEach((d, i) => {
        const dt = new Date(d.date)
        if (i > 0 && dt.getDay() === 1) {
          weeks.push({ weekStart: weekSt, revenue: weekRev })
          weekSt = d.date
          weekRev = 0
        }
        weekRev += d.revenue
      })
      weeks.push({ weekStart: weekSt, revenue: weekRev })

      // Label: show only when month changes
      let prevM = -1
      return weeks.map((w) => {
        const dt = new Date(w.weekStart)
        const m = dt.getMonth() + 1
        const showLabel = m !== prevM
        prevM = m
        return { labelTop: showLabel ? `${m}月` : '', labelBottom: '', showLabel, value: w.revenue, isToday: false }
      })
    }

    // === custom >180 days: aggregate to monthly bars ===
    if (period === 'custom' && numDays > 180) {
      const months: { key: string; year: number; month: number; revenue: number }[] = []
      const monthMap = new Map<string, { year: number; month: number; revenue: number }>()
      data.dailyTrend.forEach(d => {
        const dt = new Date(d.date)
        const y = dt.getFullYear()
        const m = dt.getMonth() + 1
        const key = `${y}-${m}`
        const entry = monthMap.get(key)
        if (entry) entry.revenue += d.revenue
        else monthMap.set(key, { year: y, month: m, revenue: d.revenue })
      })
      monthMap.forEach(v => months.push({ key: `${v.year}-${v.month}`, ...v }))

      let prevYear = -1
      return months.map((m) => {
        const showYear = m.year !== prevYear
        prevYear = m.year
        const label = showYear ? `${m.year}/${m.month}月` : `${m.month}月`
        return { labelTop: label, labelBottom: '', showLabel: true, value: m.revenue, isToday: false }
      })
    }

    // Fallback: show all with labels (same as week)
    return data.dailyTrend.map((d, i, arr) => buildDayItem(d, i, arr))
  }

  const barData = buildBarData()

  // #1b: dynamic chart subtitle + total
  const chartTotal = data.dailyTrend.reduce((sum, d) => sum + d.revenue, 0)
  const chartSubtitle: Record<Period, string> = {
    today: '本日の時間帯別売上',
    week: '今週の日別売上',
    month: '今月の日別売上',
    custom: '選択期間の売上',
  }

  // Top products from API (with fallback)
  const topProd = data.topProducts ?? initialData.topProducts ?? []

  // Quick stats from API (with fallback)
  const qs = data.quickStats ?? initialData.quickStats ?? {
    conversionRate: null, avgOrderValue: 0, repeatRate: 0, avgLTV: 0,
    newMembersCount: data.summary.newUserCount ?? 0,
  }

  // Analytics section data (with fallback to initial)
  const siteTrafficData = data.siteTraffic ?? initialData.siteTraffic ?? null
  const funnelData = data.conversionFunnel ?? initialData.conversionFunnel ?? null
  const insightsData = data.customerInsights ?? initialData.customerInsights ?? null

  // #3: safe delivery counts (API may not return these for some periods)
  const todayDeliveryCount = data.summary.todayDeliveryCount ?? initialData.summary.todayDeliveryCount ?? 0
  const tomorrowDeliveryCount = data.summary.tomorrowDeliveryCount ?? initialData.summary.tomorrowDeliveryCount ?? 0

  // Comparison data
  const cmp = data.comparison ?? initialData.comparison
  const cmpLabel = cmp?.label ?? '前週比'
  function formatChange(rate: number | null | undefined): { text: string; color: string } {
    if (rate == null) return { text: '--', color: t.textMuted }
    if (rate > 0) return { text: `${cmpLabel} +${rate}%`, color: t.success }
    if (rate < 0) return { text: `${cmpLabel} ${rate}%`, color: t.danger }
    return { text: `${cmpLabel} ±0%`, color: t.textMuted }
  }
  const revChange = formatChange(cmp?.revenueChangeRate)
  const ordChange = formatChange(cmp?.orderChangeRate)

  // KPI cards
  const kpiCards = [
    {
      label: `${periodLabel}の売上`,
      value: yen(data.summary.revenue),
      sub: revChange.text,
      subColor: revChange.color,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.accent} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
    },
    {
      label: `${periodLabel}の注文`,
      value: `${data.summary.orderCount}件`,
      sub: ordChange.text,
      subColor: ordChange.color,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.purple} strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
    },
    {
      label: '要対応',
      value: `${data.summary.pendingCount}件`,
      sub: '保留中 + 入金待ち',
      subColor: t.warning,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.warning} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    },
    {
      label: '本日の配送',
      value: `${todayDeliveryCount}件`,
      sub: `明日: ${tomorrowDeliveryCount}件`,
      subColor: t.textSecondary,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
    },
  ]

  return (
    <div style={{ fontFamily: "'Noto Sans JP', -apple-system, sans-serif", color: t.text, paddingBottom: 40 }}>

      {/* ===== Header ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: t.text }}>
            ダッシュボード
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: '4px 0 0' }}>
            {format(today, 'yyyy年M月d日（EEE）', { locale: ja })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setTheme(themeKey === 'light' ? 'dark' : 'light')}
            title={themeKey === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
            style={{
              width: 40, height: 40, borderRadius: 10, border: `1px solid ${t.border}`,
              background: t.toggleBg, cursor: 'pointer', color: t.toggleIcon,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .3s', flexShrink: 0,
            }}
          >
            {themeKey === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <a href="/admin/collections/orders/create" style={{
            padding: '8px 16px', borderRadius: 10, border: `1px solid ${t.border}`,
            background: t.surface, fontSize: 13, fontWeight: 500, color: t.textSecondary,
            display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>新規注文
          </a>
          <a href="/admin/collections/products/create" style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            fontSize: 13, fontWeight: 600, color: 'white',
            display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(99,102,241,.3)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>商品追加
          </a>
        </div>
      </div>

      {/* ===== Period Selector ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: t.tabBg, borderRadius: 12, padding: 3 }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} type="button" onClick={() => handlePeriodChange(p)} style={{
              padding: '7px 20px', borderRadius: 10, border: 'none',
              background: period === p ? t.tabActive : 'transparent',
              color: period === p ? t.text : t.textMuted,
              fontWeight: period === p ? 600 : 500, fontSize: 13, cursor: 'pointer',
              boxShadow: period === p ? t.tabShadow : 'none', transition: 'all .2s',
            }}>{PERIOD_LABELS[p]}</button>
          ))}
        </div>
        {period === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={customStart} max={todayStr}
                onChange={e => setCustomStart(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${customDateError ? t.danger : t.border}`, background: t.surface, color: t.text, fontSize: 13 }} />
              <span style={{ color: t.textMuted }}>〜</span>
              <input type="date" value={customEnd} max={todayStr}
                onChange={e => setCustomEnd(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${customDateError ? t.danger : t.border}`, background: t.surface, color: t.text, fontSize: 13 }} />
              <button type="button"
                disabled={!customStart || !customEnd || !!customDateError || loading}
                onClick={() => !customDateError && customStart && customEnd && fetchData('custom', customStart, customEnd)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: t.accent, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: !customStart || !customEnd || !!customDateError ? 0.5 : 1,
                }}>検索</button>
            </div>
            {customDateError && (
              <span style={{ fontSize: 11.5, color: t.danger, paddingLeft: 2 }}>{customDateError}</span>
            )}
          </div>
        )}
        {loading && (
          <span style={{ fontSize: 12, color: t.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: `2px solid ${t.accent}`, borderTopColor: 'transparent',
              display: 'inline-block', animation: 'ub-spin 0.7s linear infinite',
            }} />読み込み中...
          </span>
        )}
      </div>

      {/* ===== Error Banner ===== */}
      {fetchError && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`,
          color: t.danger, fontSize: 13,
        }}>
          <span>⚠ {fetchError}</span>
          <button
            type="button"
            onClick={() => fetchData(period, customStart || undefined, customEnd || undefined)}
            style={{
              padding: '5px 12px', borderRadius: 7, border: `1px solid ${t.danger}`,
              background: 'transparent', color: t.danger, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, marginLeft: 12,
            }}
          >リトライ</button>
        </div>
      )}

      {/* ===== KPI Cards ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpiCards.map((card, i) => <KpiCard key={i} {...card} t={t} />)}
      </div>

      {/* ===== Charts Row ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24, minWidth: 0 }}>
        {/* Bar chart — Revenue trend */}
        <Card t={t} style={{ padding: 24, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: t.text }}>売上推移</h3>
              <p style={{ fontSize: 11, color: t.textMuted, margin: '2px 0 0' }}>{chartSubtitle[period]}</p>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.accent }}>
              {chartTotal >= 1000 ? `¥${(chartTotal / 1000).toFixed(0)}k` : yen(chartTotal)}
            </div>
          </div>
          {barData.length > 0 ? <Bars data={barData} t={t} /> : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: 12 }}>データなし</div>
          )}
        </Card>

        {/* Donut chart — Order status */}
        <Card t={t} style={{ padding: 24, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: t.text }}>注文ステータス</h3>
            <p style={{ fontSize: 11, color: t.textMuted, margin: '2px 0 0' }}>ステータス別の注文数</p>
          </div>
          <Donut data={data.statusCounts} t={t} />
        </Card>
      </div>

      {/* ===== Bottom Grid ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>

        {/* Recent Orders Table */}
        <Card t={t} style={{ padding: 24 }}>
          <CardHeader
            title="最近の注文" sub="直近の注文一覧"
            right={<a href="/admin/collections/orders" style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12, fontWeight: 500, color: t.accent, cursor: 'pointer', textDecoration: 'none' }}>全て見る →</a>}
            t={t}
          />
          {data.recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: t.textMuted, fontSize: 13 }}>注文はまだありません</div>
          ) : (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr .8fr .7fr',
                padding: '8px 0', borderBottom: `1px solid ${t.borderLight}`,
                fontSize: 11, fontWeight: 600, color: t.textMuted, letterSpacing: 0.3,
              }}>
                <span>注文ID</span><span>顧客</span><span>金額</span><span>ステータス</span><span>時刻</span>
              </div>
              {data.recentOrders.map((o, i) => (
                <a
                  key={o.id}
                  href={`/admin/collections/orders/${o.id}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr .8fr .7fr',
                    alignItems: 'center', padding: '12px 0',
                    borderBottom: i < data.recentOrders.length - 1 ? `1px solid ${t.borderLight}` : 'none',
                    fontSize: 13, cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <span style={{ fontWeight: 600, color: t.accent, fontSize: 12 }}>{o.orderNumber || '-'}</span>
                  <span style={{ fontWeight: 500 }}>{o.customerName}</span>
                  <span style={{ fontWeight: 600 }}>{yen(o.totalAmount)}</span>
                  <StatusBadge status={o.status} themeKey={themeKey} />
                  <span style={{ color: t.textMuted, fontSize: 12 }}>{format(new Date(o.createdAt), 'MM/dd HH:mm')}</span>
                </a>
              ))}
            </>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Key Metrics 2×2 grid */}
          <Card t={t} style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px', color: t.text }}>重要指標</h3>
            <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 14px' }}>クイック統計</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KeyMetricCard
                label="コンバージョン率"
                value={qs.conversionRate != null ? `${qs.conversionRate}%` : '--'}
                accent
                t={t}
              />
              <KeyMetricCard
                label="平均注文額"
                value={yen(qs.avgOrderValue)}
                t={t}
              />
              <KeyMetricCard
                label="リピート率"
                value={`${qs.repeatRate}%`}
                t={t}
              />
              <KeyMetricCard
                label="平均LTV"
                value={yen(qs.avgLTV)}
                t={t}
              />
            </div>
          </Card>

          {/* Popular products — from topProducts API data */}
          <Card t={t} style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: t.text }}>人気商品</h3>
            <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 16px' }}>売上トップ</p>
            {(topProd.length) > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {topProd.map((p, i) => {
                  const maxRev = topProd[0].revenue || 1
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: t.text }}>{p.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>{p.salesCount}個</span>
                      </div>
                      <div style={{ height: 6, background: t.borderLight, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${(p.revenue / maxRev) * 100}%`,
                          background: i === 0
                            ? `linear-gradient(90deg, ${t.accent}, ${t.accentLight})`
                            : `rgba(99,102,241,${0.5 - i * 0.1})`,
                          transition: 'width .8s',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: t.textMuted, fontSize: 13 }}>
                まだ売上データがありません
              </div>
            )}
          </Card>

          {/* Low stock alerts */}
          {(data.lowStockProducts?.length ?? 0) > 0 && (
            <Card t={t} style={{ padding: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px', color: t.text }}>在庫アラート</h3>
              <p style={{ fontSize: 11, color: t.textMuted, margin: '0 0 12px' }}>低在庫の商品</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.lowStockProducts!.map((p) => (
                  <a key={p.id} href={`/admin/collections/products/${p.id}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', borderRadius: 8,
                    background: p.stock === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                    textDecoration: 'none', fontSize: 12.5, color: t.text,
                  }}>
                    <span style={{ fontWeight: 500 }}>{p.title}</span>
                    <span style={{ fontWeight: 700, color: p.stock === 0 ? t.danger : t.warning }}>
                      残り{p.stock ?? '∞'}個
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ===== Analytics Row ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>

        {/* サイトトラフィック */}
        <Card t={t} style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: t.text }}>サイトトラフィック</h3>
              <p style={{ fontSize: 11, color: t.textMuted, margin: '2px 0 0' }}>GA4 Analytics</p>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              padding: '3px 8px', borderRadius: 6,
              background: t.accentBg, color: t.accent,
            }}>GA4</span>
          </div>
          {siteTrafficData ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
                {[
                  { l: 'セッション', v: (siteTrafficData.sessions ?? 0).toLocaleString() },
                  { l: 'ユーザー', v: (siteTrafficData.totalUsers ?? 0).toLocaleString() },
                  { l: 'ページビュー', v: (siteTrafficData.pageviews ?? 0).toLocaleString() },
                  { l: '直帰率', v: siteTrafficData.bounceRate != null ? `${siteTrafficData.bounceRate}%` : '--' },
                  { l: '平均滞在', v: siteTrafficData.avgSessionDuration != null ? formatDuration(siteTrafficData.avgSessionDuration) : '--' },
                  { l: 'PV/セッション', v: siteTrafficData.pagesPerSession != null ? `${siteTrafficData.pagesPerSession}` : '--' },
                ].map((item, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 10.5, color: t.textMuted, marginBottom: 2 }}>{item.l}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{item.v}</div>
                  </div>
                ))}
              </div>
              {siteTrafficData.dailyChart && siteTrafficData.dailyChart.length > 1 && (
                <MiniAreaChart
                  data={siteTrafficData.dailyChart.map(d => d.sessions)}
                  color={t.accent}
                />
              )}
            </>
          ) : (
            <div style={{ padding: '24px 0', textAlign: 'center', color: t.textMuted, fontSize: 12 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>📊</div>
              <div>GA4 Data API 未設定</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>SiteSettings で GA4 Property ID を設定してください</div>
            </div>
          )}
        </Card>

        {/* コンバージョンファネル */}
        <Card t={t} style={{ padding: 24 }}>
          <CardHeader title="コンバージョンファネル" sub="訪問から購入まで" t={t} />
          {(() => {
            const steps = [
              { label: 'セッション', value: funnelData?.sessions ?? null },
              { label: 'カート追加', value: funnelData?.addToCarts ?? null },
              { label: '購入完了', value: funnelData?.purchases ?? 0 },
            ]
            const topVal = steps[0].value ?? 1
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {steps.map((step, i) => {
                  const val = step.value
                  const pct = val != null && topVal > 0 ? Math.round((val / topVal) * 100) : null
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, color: t.textSecondary }}>{step.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                          {val != null ? val.toLocaleString() : '--'}
                          {pct != null && <span style={{ fontSize: 11, fontWeight: 500, color: t.textMuted, marginLeft: 6 }}>({pct}%)</span>}
                        </span>
                      </div>
                      <div style={{ height: 6, background: t.borderLight, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${pct ?? 0}%`,
                          background: i === 0
                            ? `linear-gradient(90deg, ${t.accent}, ${t.accentLight})`
                            : `rgba(99,102,241,${0.7 - i * 0.2})`,
                          transition: 'width .8s',
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </Card>

        {/* カスタマーインサイト */}
        <Card t={t} style={{ padding: 24 }}>
          <CardHeader title="カスタマーインサイト" sub="顧客行動" t={t} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'リピート率', value: insightsData ? `${insightsData.repeatRate}%` : '--', color: t.success },
              { label: '平均LTV', value: insightsData ? yen(insightsData.avgLTV) : '--', color: undefined },
              { label: '平均注文額', value: insightsData ? yen(insightsData.avgOrderValue) : '--', color: undefined },
              { label: `${periodLabel}の新規会員`, value: insightsData ? `${insightsData.newMembersCount}人` : '--', color: t.accent },
              { label: 'リターン訪問者率', value: insightsData?.returningVisitorRate != null ? `${insightsData.returningVisitorRate}%` : '--', color: undefined },
            ].map((row, i, arr) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '11px 0',
                borderBottom: i < arr.length - 1 ? `1px solid ${t.borderLight}` : 'none',
              }}>
                <span style={{ fontSize: 12.5, color: t.textSecondary }}>{row.label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: row.color ?? t.text }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      <style>{`@keyframes ub-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
