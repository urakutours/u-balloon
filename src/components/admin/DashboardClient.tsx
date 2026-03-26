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
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  preparing: { bg: '#e0e7ff', text: '#3730a3' },
  shipped: { bg: '#d1fae5', text: '#065f46' },
  delivered: { bg: '#f0fdf4', text: '#166534' },
  cancelled: { bg: '#fef2f2', text: '#991b1b' },
}

type Period = 'today' | 'week' | 'month' | 'custom'

interface DashboardData {
  summary: {
    orderCount: number
    revenue: number
    pendingCount: number
    newUserCount: number
    totalOrders: number
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
  upcomingHolidays: Array<{
    id: string
    date: string
    isHoliday: boolean
    shippingAvailable: boolean
    holidayReason: string
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
  const [period, setPeriod] = useState<Period>('today')
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
    if (period !== 'today') {
      fetchData(period, customStart, customEnd)
    }
  }, [period, fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (p === 'today') {
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
            <span style={{ color: 'var(--theme-elevation-500)' }}>〜</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="ub-date-input"
            />
            <button
              type="button"
              onClick={handleCustomSearch}
              className="ub-period-btn ub-period-btn--active"
              disabled={!customStart || !customEnd}
            >
              検索
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--theme-elevation-500)', fontSize: '0.875rem' }}>
          読み込み中...
        </div>
      )}

      {/* Summary Cards */}
      <div className="ub-summary-cards">
        <SummaryCard
          title={`${periodLabel}の注文`}
          value={`${data.summary.orderCount}件`}
          sub={`¥${data.summary.revenue.toLocaleString()}`}
        />
        <SummaryCard
          title="要対応（保留中）"
          value={`${data.summary.pendingCount}件`}
          highlight={data.summary.pendingCount > 0}
        />
        <SummaryCard
          title={`${periodLabel}の新規会員`}
          value={`${data.summary.newUserCount}件`}
        />
        <SummaryCard
          title="全注文数"
          value={`${data.summary.totalOrders}件`}
        />
      </div>

      {/* Charts */}
      {data.dailyTrend.length > 1 && (
        <div className="ub-charts-grid">
          <div className="ub-card">
            <h3 className="ub-card-title">売上推移</h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <AreaChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-elevation-150)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(parseISO(v), 'M/d')}
                    tick={{ fontSize: 11, fill: 'var(--theme-elevation-500)' }}
                  />
                  <YAxis
                    tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: 'var(--theme-elevation-500)' }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value: number) => [`¥${value.toLocaleString()}`, '売上']}
                    labelFormatter={(label) => format(parseISO(label as string), 'yyyy/MM/dd')}
                    contentStyle={{
                      backgroundColor: 'var(--theme-elevation-100)',
                      border: '1px solid var(--theme-elevation-250)',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="ub-card">
            <h3 className="ub-card-title">注文数推移</h3>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={data.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-elevation-150)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => format(parseISO(v), 'M/d')}
                    tick={{ fontSize: 11, fill: 'var(--theme-elevation-500)' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--theme-elevation-500)' }}
                    width={30}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}件`, '注文数']}
                    labelFormatter={(label) => format(parseISO(label as string), 'yyyy/MM/dd')}
                    contentStyle={{
                      backgroundColor: 'var(--theme-elevation-100)',
                      border: '1px solid var(--theme-elevation-250)',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                    }}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="ub-main-grid">
        {/* Recent Orders */}
        <div className="ub-card">
          <h3 className="ub-card-title">最近の注文</h3>
          {data.recentOrders.length === 0 ? (
            <p className="ub-empty-text">注文はまだありません</p>
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
                        <td style={{ textAlign: 'right' }}>
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
                          {format(new Date(order.createdAt), 'yyyy/MM/dd')}
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
            <h3 className="ub-card-title">ステータス別注文数</h3>
            <div className="ub-status-grid">
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = data.statusCounts[key] || 0
                const colors = STATUS_COLORS[key] || {
                  bg: '#f3f4f6',
                  text: '#374151',
                }
                const needsAttention = key === 'pending' || key === 'confirmed'
                return (
                  <a
                    key={key}
                    href={`/admin/collections/orders?where[or][0][and][0][status][equals]=${key}`}
                    className="ub-status-item"
                    style={{
                      backgroundColor: colors.bg,
                      color: colors.text,
                      fontWeight: needsAttention && count > 0 ? 700 : 400,
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
            <h3 className="ub-card-title">今後2週間の休業日・発送不可日</h3>
            {data.upcomingHolidays.length === 0 ? (
              <p className="ub-empty-text">予定なし</p>
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
                        {format(d, 'yyyy/MM/dd')}（{dayOfWeek}）
                      </span>
                      <span>
                        {entry.isHoliday && (
                          <span className="ub-badge ub-badge--holiday">休業</span>
                        )}
                        {!entry.shippingAvailable && (
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
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  sub,
  highlight,
}: {
  title: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`ub-summary-card ${highlight ? 'ub-summary-card--highlight' : ''}`}>
      <div className="ub-summary-card__title">{title}</div>
      <div className="ub-summary-card__value">{value}</div>
      {sub && <div className="ub-summary-card__sub">{sub}</div>}
    </div>
  )
}
