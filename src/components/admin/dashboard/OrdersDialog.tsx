'use client'

import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format } from 'date-fns'

// ============================================================
// Types
// ============================================================
interface OrderRow {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
  desiredArrivalDate: string | null
  desiredTimeSlot: string | null
}

type OrderKind = 'revenue' | 'orders' | 'pending' | 'shipping-today'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: OrderKind
  title: string
  from?: string
  to?: string
}

// ============================================================
// Status config (minimal, mirrors DashboardClient palette)
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

const STATUS_BG: Record<string, string> = {
  pending: '#fef3c7',
  awaiting_payment: '#fce7f3',
  confirmed: '#dbeafe',
  preparing: '#e0e7ff',
  shipped: '#d1fae5',
  delivered: '#f0fdf4',
  cancelled: '#fee2e2',
}

const STATUS_TEXT: Record<string, string> = {
  pending: '#92400e',
  awaiting_payment: '#9d174d',
  confirmed: '#1e40af',
  preparing: '#3730a3',
  shipped: '#065f46',
  delivered: '#166534',
  cancelled: '#991b1b',
}

function StatusBadge({ status }: { status: string }) {
  const bg = STATUS_BG[status] ?? '#f3f4f6'
  const text = STATUS_TEXT[status] ?? '#374151'
  return (
    <span style={{
      // Grid セル内では grid item が blockify されるので、
      // justifySelf: 'start' を付けないとセル全幅に広がってしまう。
      justifySelf: 'start',
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 20,
      background: bg, color: text,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
      width: 'fit-content',
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ============================================================
// Kind → listview filter URL
// ============================================================
function buildListUrl(kind: OrderKind): string {
  if (kind === 'pending') {
    return '/admin/collections/orders?where[status][in][0]=pending&where[status][in][1]=awaiting_payment'
  }
  if (kind === 'shipping-today') {
    return '/admin/collections/orders?where[status][in][0]=confirmed&where[status][in][1]=preparing'
  }
  return '/admin/collections/orders'
}

// ============================================================
// Main component
// ============================================================
export default function OrdersDialog({ open, onOpenChange, kind, title, from, to }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ kind })
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/admin/dashboard/orders?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { orders: OrderRow[]; totalCount: number }
      setOrders(json.orders)
      setTotalCount(json.totalCount)
    } catch {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, from, to])

  const yen = (n: number) => '¥' + n.toLocaleString()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
            {!loading && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '2px 8px',
                borderRadius: 20, background: '#e0e7ff', color: '#3730a3',
              }}>{totalCount}件</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div style={{ overflowY: 'auto', flex: 1, paddingTop: 4 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  height: 44, borderRadius: 8,
                  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                  backgroundSize: '400% 100%',
                  animation: 'ub-skeleton 1.4s ease infinite',
                }} />
              ))}
              <style>{`@keyframes ub-skeleton { 0%{background-position:100% 50%}100%{background-position:0% 50%} }`}</style>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#ef4444' }}>
              <p style={{ marginBottom: 12 }}>{error}</p>
              <button
                type="button"
                onClick={loadOrders}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #ef4444',
                  background: 'transparent', color: '#ef4444', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >リトライ</button>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
              該当する注文はありません
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr 1fr 0.5fr',
                padding: '8px 4px',
                borderBottom: '1px solid #e2e8f0',
                fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.3,
              }}>
                <span>注文番号</span>
                <span>顧客</span>
                <span>金額</span>
                <span>ステータス</span>
                <span>日時</span>
                <span></span>
              </div>
              {orders.map((o, i) => (
                <div
                  key={o.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr 1fr 0.5fr',
                    alignItems: 'center',
                    padding: '10px 4px',
                    borderBottom: i < orders.length - 1 ? '1px solid #f1f5f9' : 'none',
                    fontSize: 13,
                  }}
                >
                  <a
                    href={`/admin/collections/orders/${o.id}`}
                    style={{
                      fontWeight: 600, color: '#6366f1', fontSize: 12,
                      textDecoration: 'none',
                    }}
                  >
                    {o.orderNumber || '-'}
                  </a>
                  <span style={{ fontWeight: 500 }}>{o.customerName}</span>
                  <span style={{ fontWeight: 600 }}>{yen(o.totalAmount)}</span>
                  <StatusBadge status={o.status} />
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>
                    {format(new Date(o.createdAt), 'MM/dd HH:mm')}
                  </span>
                  <a
                    href={`/admin/collections/orders/${o.id}`}
                    style={{
                      fontSize: 12, color: '#6366f1', textDecoration: 'none',
                      fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                  >
                    詳細
                  </a>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div style={{
            paddingTop: 12, borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <a
              href={buildListUrl(kind)}
              style={{
                fontSize: 13, color: '#6366f1', textDecoration: 'none',
                fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              一覧で全件を見る →
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
