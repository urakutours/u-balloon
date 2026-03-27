'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

const STATUS_LABELS: Record<string, string> = {
  pending: '保留中',
  awaiting_payment: '入金待ち',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  awaiting_payment: { bg: '#fce7f3', text: '#9d174d' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  preparing: { bg: '#e8d5f5', text: '#6b21a8' },
  shipped: { bg: '#d1fae5', text: '#065f46' },
  delivered: { bg: '#ccfbf1', text: '#0f766e' },
  cancelled: { bg: '#fef2f2', text: '#991b1b' },
}

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
  night: '夜',
  unspecified: '未指定',
}

type Period = 'today' | 'week' | 'month' | 'custom'

interface DashboardData {
  summary: {
    orderCount: number
    revenue: number
    pendingCount: number
    newUserCount: number
    totalOrders: number
    todayDeliveryCount: number
    tomorrowDeliveryCount: number
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
  period: { type: string; start: string; end: string }
}

const PERIOD_LABELS: Record<Period, string> = {
  today: '本日',
  week: '今週',
  month: '今月',
  custom: 'カスタム',
}

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export default function DashboardClient({
  initialData,
}: {
  initialData: DashboardData
}) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [period, setPeriod] = useState<Period>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(
    async (p: Period, start?: string, end?: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ period: p })
        if (p === 'custom' && start) params.set('start', start)
        if (p === 'custom' && end) params.set('end', end)
        const res = await fetch(`/api/admin/dashboard?${params}`, {
          credentials: 'include',
        })
        if (res.ok) {
          setData(await res.json())
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (period !== 'week') {
      fetchData(period, customStart, customEnd)
    }
  }, [period, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (p === 'week') {
      setData(initialData)
    }
  }

  const handleCustomSearch = () => {
    if (customStart && customEnd) {
      fetchData('custom', customStart, customEnd)
    }
  }

  const periodLabel = period === 'custom' && customStart && customEnd
    ? `${customStart} 〜 ${customEnd}`
    : PERIOD_LABELS[period]

  return (
    <div className="ub-dashboard">
      {/* Quick Actions */}
      <div className="ub-quick-actions">
        <a href="/admin/collections/orders/create" className="ub-quick-action-btn">
          + 新規注文
        </a>
        <a href="/admin/collections/products/create" className="ub-quick-action-btn">
          + 商品追加
        </a>
        <a href="/admin/collections/business-calendar" className="ub-quick-action-btn">
          営業カレンダー
        </a>
      </div>

      {/* Period Selector */}
      <div className="ub-period-selector">
        <div className="ub-period-buttons">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodChange(p)}
              className={`ub-period-btn ${period === p ? 'ub-period-btn--active' : ''}`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="ub-custom-range">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="ub-date-input"
            />
            <span style={{ color: 'var(--ub-text-muted)' }}>〜</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="ub-date-input"
            />
            <button
              type="button"
              onClick={handleCustomSearch}
              className="ub-btn ub-btn--primary"
              disabled={!customStart || !customEnd}
            >
              検索
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="ub-loading">
          <div className="ub-spinner" />
          読み込み中...
        </div>
      )}

      {/* Summary Cards */}
      <div className="ub-summary-cards">
        <SummaryCard
          icon="📦"
          title={`${periodLabel}の注文`}
          value={`${data.summary.orderCount}件`}
          sub={`¥${data.summary.revenue.toLocaleString()}`}
          accent="teal"
        />
        <SummaryCard
          icon="⚠️"
          title="要対応"
          value={`${data.summary.pendingCount}件`}
          sub="保留中 + 確認済み"
          highlight={data.summary.pendingCount > 0}
          accent="coral"
        />
        <SummaryCard
          icon="🚚"
          title="本日の配達"
          value={`${data.summary.todayDeliveryCount}件`}
          sub={`明日: ${data.summary.tomorrowDeliveryCount}件`}
          accent="teal"
        />
        <SummaryCard
          icon="👤"
          title={`${periodLabel}の新規会員`}
          value={`${data.summary.newUserCount}件`}
          accent="pink"
        />
      </div>

      {/* Today's Delivery Breakdown */}
      {data.summary.todayDeliveryCount > 0 && data.deliverySlotCounts && (
        <div className="ub-delivery-widget">
          <div className="ub-card">
            <h3 className="ub-card-title">
              <span className="ub-card-title-icon">🚚</span>
              本日の配達スケジュール
            </h3>
            <div className="ub-delivery-slots">
              {Object.entries(TIME_SLOT_LABELS).map(([key, label]) => {
                const count = data.deliverySlotCounts?.[key] || 0
                return (
                  <a
                    key={key}
                    href={`/admin/collections/orders?where[or][0][and][0][desiredTimeSlot][equals]=${key}`}
                    className={`ub-delivery-slot ${count > 0 ? 'ub-delivery-slot--active' : ''}`}
                  >
                    <div className="ub-delivery-slot__label">{label}</div>
                    <div className="ub-delivery-slot__count">{count}</div>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {data.dailyTrend.length > 1 && (
        <div className="ub-charts-grid">
          <div className="ub-card">
            <h3 className="ub-card-title">
              <span className="ub-card-title-icon">📈</span>
              売上推移
            </h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ub-divider)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(parseISO(v), 'M/d')}
                    tick={{ fontSize: 11, fill: 'var(--ub-text-muted)' }}
                  />
                  <YAxis
                    tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'var(--ub-text-muted)' }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value) => [`¥${Number(value).toLocaleString()}`, '売上']}
                    labelFormatter={(label) => format(parseISO(label as string), 'yyyy/MM/dd')}
                    contentStyle={{
                      backgroundColor: 'var(--ub-card-bg)',
                      border: '1px solid var(--ub-divider)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#04929c"
                    fill="#04929c"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ub-card">
            <h3 className="ub-card-title">
              <span className="ub-card-title-icon">📊</span>
              注文数推移
            </h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ub-divider)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(parseISO(v), 'M/d')}
                    tick={{ fontSize: 11, fill: 'var(--ub-text-muted)' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--ub-text-muted)' }}
                    width={30}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}件`, '注文数']}
                    labelFormatter={(label) => format(parseISO(label as string), 'yyyy/MM/dd')}
                    contentStyle={{
                      backgroundColor: 'var(--ub-card-bg)',
                      border: '1px solid var(--ub-divider)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                  <Bar dataKey="orders" fill="#e369a7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Today's Summary (single data point) */}
      {data.dailyTrend.length === 1 && (data.summary.orderCount > 0 || data.summary.revenue > 0) && (
        <div className="ub-card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1.5rem' }}>
          <h3 className="ub-card-title" style={{ justifyContent: 'center' }}>
            <span className="ub-card-title-icon">📈</span>
            本日のサマリー
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ub-text-secondary)', marginBottom: '0.25rem' }}>売上合計</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ub-brand-teal)' }}>
                ¥{data.summary.revenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ub-text-secondary)', marginBottom: '0.25rem' }}>注文数</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--ub-text-primary)' }}>
                {data.summary.orderCount}件
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="ub-main-grid">
        {/* Recent Orders */}
        <div className="ub-card">
          <h3 className="ub-card-title">
            <span className="ub-card-title-icon">📋</span>
            最近の注文
          </h3>
          {data.recentOrders.length === 0 ? (
            <div className="ub-empty-state">
              <div className="ub-empty-state__icon">📦</div>
              <div className="ub-empty-state__text">注文はまだありません</div>
              <div className="ub-empty-state__action">
                <a href="/admin/collections/orders/create" className="ub-quick-action-btn">
                  テスト注文を作成
                </a>
              </div>
            </div>
          ) : (
            <div className="ub-table-wrapper">
              <table className="ub-table">
                <thead>
                  <tr>
                    <th>注文番号</th>
                    <th>顧客</th>
                    <th style={{ textAlign: 'right' }}>金額</th>
                    <th>ステータス</th>
                    <th>日時</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => {
                    const colors = STATUS_COLORS[order.status] || {
                      bg: '#f3f4f6',
                      text: '#374151',
                    }
                    return (
                      <tr key={order.id}>
                        <td>
                          <a
                            href={`/admin/collections/orders/${order.id}`}
                            className="ub-link"
                          >
                            {order.orderNumber || '-'}
                          </a>
                        </td>
                        <td>{order.customerName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ¥{order.totalAmount.toLocaleString()}
                        </td>
                        <td>
                          <span
                            className="ub-status-badge"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                            }}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="ub-muted-text">
                          {format(new Date(order.createdAt), 'MM/dd HH:mm')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: '0.75rem' }}>
            <a href="/admin/collections/orders" className="ub-link">
              全ての注文を見る →
            </a>
          </div>
        </div>

        {/* Right column */}
        <div className="ub-right-column">
          {/* Status Summary */}
          <div className="ub-card">
            <h3 className="ub-card-title">
              <span className="ub-card-title-icon">📊</span>
              ステータス別注文数
            </h3>
            <div className="ub-status-grid">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = data.statusCounts[key] || 0
                const colors = STATUS_COLORS[key] || {
                  bg: '#f3f4f6',
                  text: '#374151',
                }
                const needsAttention = key === 'pending' || key === 'confirmed' || key === 'awaiting_payment'
                return (
                  <a
                    key={key}
                    href={`/admin/collections/orders?where[or][0][and][0][status][equals]=${key}`}
                    className="ub-status-item"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      fontWeight: needsAttention && count > 0 ? 700 : 500,
                    }}
                  >
                    <span>{label}</span>
                    <span className="ub-status-count">{count}</span>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Upcoming Holidays */}
          <div className="ub-card">
            <h3 className="ub-card-title">
              <span className="ub-card-title-icon">📅</span>
              今後2週間の休業日・発送不可日
            </h3>
            {data.upcomingHolidays.length === 0 ? (
              <div className="ub-empty-state">
                <div className="ub-empty-state__text" style={{ color: 'var(--ub-brand-teal)' }}>
                  予定なし — 全日発送可能
                </div>
              </div>
            ) : (
              <div className="ub-holiday-list">
                {data.upcomingHolidays.map((entry) => {
                  const d = parseISO(entry.date)
                  const dayOfWeek = DAY_NAMES[d.getUTCDay()]
                  const todayStr = format(new Date(), 'yyyy-MM-dd')
                  const entryDateStr = entry.date.substring(0, 10)
                  const isToday = entryDateStr === todayStr
                  return (
                    <div
                      key={entry.id}
                      className={`ub-holiday-item ${isToday ? 'ub-holiday-item--today' : ''}`}
                    >
                      <span className="ub-holiday-date">
                        {format(d, 'MM/dd')}（{dayOfWeek}）
                      </span>
                      <span>
                        {entry.isHoliday && (
                          <span className="ub-badge ub-badge--holiday">休業</span>
                        )}
                        {!entry.shippingAvailable && !entry.isHoliday && (
                          <span className="ub-badge ub-badge--no-ship">発送不可</span>
                        )}
                      </span>
                      {entry.holidayReason && (
                        <span className="ub-muted-text" style={{ fontSize: '0.8125rem' }}>
                          {entry.holidayReason}
                        </span>
                      )}
                      {isToday && (
                        <span className="ub-badge ub-badge--today">本日</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: '0.75rem' }}>
              <a href="/admin/collections/business-calendar" className="ub-link">
                営業カレンダーを管理 →
              </a>
            </div>
          </div>

          {/* Low Stock Alert */}
          {initialData.lowStockProducts && initialData.lowStockProducts.length > 0 && (
            <div className="ub-card">
              <h3 className="ub-card-title">⚠️ 在庫アラート</h3>
              <div className="ub-stock-alerts">
                {initialData.lowStockProducts.map((product: any) => (
                  <div key={product.id} className="ub-stock-alert-item">
                    <a href={`/admin/collections/products/${product.id}`} className="ub-stock-alert-link">
                      <span className="ub-stock-alert-name">{product.title}</span>
                      <span className={`ub-stock-alert-count ${product.stock === 0 ? 'ub-stock-alert-count--zero' : ''}`}>
                        残り {product.stock ?? '∞'}個
                      </span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  sub,
  highlight,
  accent,
}: {
  icon: string
  title: string
  value: string
  sub?: string
  highlight?: boolean
  accent?: 'teal' | 'pink' | 'coral'
}) {
  const accentClass = accent ? `ub-summary-card--${accent}` : ''
  return (
    <div className={`ub-summary-card ${highlight ? 'ub-summary-card--highlight' : accentClass}`}>
      <div className="ub-summary-card__header">
        <span className="ub-summary-card__icon">{icon}</span>
        <span className="ub-summary-card__title">{title}</span>
      </div>
      <div className="ub-summary-card__value">{value}</div>
      {sub && <div className="ub-summary-card__sub">{sub}</div>}
    </div>
  )
}
