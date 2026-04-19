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
interface InquiryRow {
  id: string
  formTitle: string
  submitterEmail: string | null
  status: string
  createdAt: string
  dataPreview: string
}

type InquiryKind = 'unresponded' | 'recent'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: InquiryKind
  title: string
}

// ============================================================
// Status badge
// ============================================================
const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: '未対応',
  in_progress: '対応中',
  resolved: '対応済み',
}
const INQUIRY_STATUS_BG: Record<string, string> = {
  new: '#fee2e2',
  in_progress: '#fef3c7',
  resolved: '#d1fae5',
}
const INQUIRY_STATUS_TEXT: Record<string, string> = {
  new: '#991b1b',
  in_progress: '#92400e',
  resolved: '#065f46',
}

function InquiryStatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 20,
      background: INQUIRY_STATUS_BG[status] ?? '#f3f4f6',
      color: INQUIRY_STATUS_TEXT[status] ?? '#374151',
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {INQUIRY_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ============================================================
// Main component
// ============================================================
export default function InquiriesDialog({ open, onOpenChange, kind, title }: Props) {
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<Set<string>>(new Set())

  const loadInquiries = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/dashboard/inquiries?kind=${kind}`, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { inquiries: InquiryRow[] }
      setInquiries(json.inquiries)
    } catch {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadInquiries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind])

  const handleResolve = async (id: string) => {
    setResolving(prev => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/form-submissions/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      })
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '')
        console.error('[InquiriesDialog] resolve failed', res.status, bodyText)
        if (res.status === 401 || res.status === 403) {
          alert('認証が切れています。再ログインしてください。')
        } else {
          alert(`ステータスの更新に失敗しました (HTTP ${res.status})`)
        }
        return
      }
      await loadInquiries()
    } catch (err) {
      console.error('[InquiriesDialog] resolve error', err)
      alert('ステータスの更新に失敗しました (ネットワークエラー)')
    } finally {
      setResolving(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader>
          <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {title}
            {!loading && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '2px 8px',
                borderRadius: 20, background: '#fee2e2', color: '#991b1b',
              }}>{inquiries.length}件</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div style={{ overflowY: 'auto', flex: 1, paddingTop: 4 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 0' }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  height: 60, borderRadius: 8,
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
                onClick={loadInquiries}
                style={{
                  padding: '6px 14px', borderRadius: 8, border: '1px solid #ef4444',
                  background: 'transparent', color: '#ef4444', fontSize: 12,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >リトライ</button>
            </div>
          )}

          {!loading && !error && inquiries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
              {kind === 'unresponded' ? '未対応の問い合わせはありません' : '問い合わせはまだありません'}
            </div>
          )}

          {!loading && !error && inquiries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {inquiries.map((inq, i) => (
                <div
                  key={inq.id}
                  style={{
                    padding: '12px 4px',
                    borderBottom: i < inquiries.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{inq.formTitle}</span>
                      <InquiryStatusBadge status={inq.status} />
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {format(new Date(inq.createdAt), 'MM/dd HH:mm')}
                    </span>
                  </div>

                  {inq.submitterEmail && (
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      {inq.submitterEmail}
                    </div>
                  )}

                  {inq.dataPreview && (
                    <div style={{
                      fontSize: 12, color: '#64748b', marginBottom: 8,
                      padding: '4px 8px', background: '#f8fafc',
                      borderRadius: 6, borderLeft: '3px solid #e2e8f0',
                    }}>
                      {inq.dataPreview}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {inq.status !== 'resolved' && (
                      <button
                        type="button"
                        disabled={resolving.has(inq.id)}
                        onClick={() => handleResolve(inq.id)}
                        style={{
                          padding: '4px 10px', borderRadius: 6,
                          border: '1px solid #10b981',
                          background: 'transparent', color: '#065f46',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          opacity: resolving.has(inq.id) ? 0.5 : 1,
                        }}
                      >
                        {resolving.has(inq.id) ? '更新中...' : '対応済みにする'}
                      </button>
                    )}
                    <a
                      href={`/admin/collections/form-submissions/${inq.id}`}
                      style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
                    >
                      詳細
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && (
          <div style={{
            paddingTop: 12, borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <a
              href="/admin/collections/form-submissions"
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
