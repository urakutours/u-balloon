'use client'

import React, { useRef, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────

type ImportResult = {
  total: number
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(href)
}

// ─── Section components ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--theme-elevation-150, #e2e8f0)', color: 'var(--theme-text, #1e293b)' }}>
      {children}
    </h2>
  )
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 9999,
      fontSize: 12, fontWeight: 600,
      background: ok ? 'var(--theme-success-100, #dcfce7)' : 'var(--theme-error-100, #fee2e2)',
      color: ok ? 'var(--theme-success-600, #16a34a)' : 'var(--theme-error-600, #dc2626)',
    }}>
      {ok ? '完了' : 'エラーあり'}
    </span>
  )
}

// ─── Export Section ──────────────────────────────────────────────────────────

function ExportSection() {
  const [orderDateFrom, setOrderDateFrom] = useState('')
  const [orderDateTo, setOrderDateTo] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async (type: 'orders' | 'products' | 'customers') => {
    setLoading(type)
    setError(null)
    try {
      const params = new URLSearchParams({ format: 'csv' })
      if (type === 'orders') {
        if (orderStatus) params.set('status', orderStatus)
        if (orderDateFrom) params.set('from', orderDateFrom)
        if (orderDateTo) params.set('to', orderDateTo)
      }
      const filename = `${type}_${new Date().toISOString().slice(0, 10)}.csv`
      await downloadFile(`/api/admin/export/${type}?${params}`, filename)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ダウンロードに失敗しました')
    } finally {
      setLoading(null)
    }
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: active ? 'not-allowed' : 'pointer',
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: active ? 'var(--theme-elevation-100, #f1f5f9)' : 'var(--theme-bg, white)',
    color: 'var(--theme-text, #1e293b)',
    opacity: active ? 0.6 : 1,
    transition: 'background 0.15s',
  })

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, fontSize: 13,
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'var(--theme-bg, white)',
    color: 'var(--theme-text, #1e293b)',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    minWidth: 140,
  }

  return (
    <div>
      <SectionTitle>⬇ エクスポート</SectionTitle>

      {error && (
        <p style={{ color: 'var(--theme-error-500, #ef4444)', fontSize: 13, marginBottom: 12 }}>
          ⚠ {error}
        </p>
      )}

      {/* Orders */}
      <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)', background: 'var(--theme-elevation-50, #f8fafc)' }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--theme-text, #1e293b)' }}>注文データ</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: 'var(--theme-text-secondary, #64748b)' }}>期間</label>
          <input type="date" value={orderDateFrom} onChange={e => setOrderDateFrom(e.target.value)} style={inputStyle} />
          <span style={{ fontSize: 12 }}>〜</span>
          <input type="date" value={orderDateTo} onChange={e => setOrderDateTo(e.target.value)} style={inputStyle} />
          <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)} style={selectStyle}>
            <option value="">全ステータス</option>
            <option value="pending">保留中</option>
            <option value="awaiting_payment">入金待ち</option>
            <option value="confirmed">確認済み</option>
            <option value="preparing">準備中</option>
            <option value="shipped">発送済み</option>
            <option value="delivered">配達完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
        </div>
        <button onClick={() => handleExport('orders')} disabled={loading === 'orders'} style={btnStyle(loading === 'orders')}>
          {loading === 'orders' ? '⏳ ダウンロード中...' : '📥 CSVダウンロード'}
        </button>
      </div>

      {/* Products + Customers side by side */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {(['products', 'customers'] as const).map(type => (
          <div key={type} style={{ flex: 1, minWidth: 200, padding: 16, borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)', background: 'var(--theme-elevation-50, #f8fafc)' }}>
            <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--theme-text, #1e293b)' }}>
              {type === 'products' ? '商品データ' : '顧客データ'}
            </p>
            <button onClick={() => handleExport(type)} disabled={loading === type} style={btnStyle(loading === type)}>
              {loading === type ? '⏳ ダウンロード中...' : '📥 CSVダウンロード'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Import Section ──────────────────────────────────────────────────────────

function ImportSection() {
  const [importType, setImportType] = useState<'products' | 'customers'>('products')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0] ?? null
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleTemplateDownload = async () => {
    try {
      await downloadFile(`/api/admin/import/template?type=${importType}`, `${importType}_template.csv`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'テンプレートのダウンロードに失敗しました')
    }
  }

  const handleImport = async () => {
    if (!file) { setError('ファイルを選択してください'); return }
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/import/${importType}`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
      setResult(json as ImportResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'インポートに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none',
    background: loading ? 'var(--theme-elevation-200, #cbd5e1)' : 'var(--theme-success-500, #22c55e)',
    color: loading ? 'var(--theme-text-secondary, #64748b)' : 'white',
    opacity: loading ? 0.7 : 1,
  }

  const btnSecondary: React.CSSProperties = {
    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'transparent',
    color: 'var(--theme-text-secondary, #64748b)',
  }

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, fontSize: 13,
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'var(--theme-bg, white)',
    color: 'var(--theme-text, #1e293b)',
  }

  const hasErrors = (result?.errors?.length ?? 0) > 0

  return (
    <div>
      <SectionTitle>⬆ インポート（商品・顧客のみ）</SectionTitle>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Type selector */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--theme-text-secondary, #64748b)', minWidth: 56 }}>対象</label>
          <select
            value={importType}
            onChange={e => { setImportType(e.target.value as 'products' | 'customers'); setFile(null); setResult(null) }}
            style={inputStyle}
          >
            <option value="products">商品</option>
            <option value="customers">顧客</option>
          </select>
          <button onClick={handleTemplateDownload} style={btnSecondary}>
            📄 テンプレートをダウンロード
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--theme-elevation-200, #cbd5e1)',
            borderRadius: 8, padding: '24px 20px',
            textAlign: 'center', cursor: 'pointer',
            background: file ? 'var(--theme-success-50, #f0fdf4)' : 'var(--theme-elevation-50, #f8fafc)',
            transition: 'background 0.15s',
          }}
        >
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
          {file ? (
            <p style={{ fontSize: 13, color: 'var(--theme-success-600, #16a34a)', fontWeight: 600 }}>
              ✅ {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--theme-text-secondary, #64748b)' }}>
              CSVファイルをドロップするか、クリックして選択
            </p>
          )}
        </div>

        {/* Import button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={handleImport} disabled={loading || !file} style={btnPrimary}>
            {loading ? '⏳ インポート中...' : '▶ インポート実行'}
          </button>
          {file && (
            <button
              onClick={() => { setFile(null); setResult(null); setError(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
              style={btnSecondary}
            >
              ✕ クリア
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: 'var(--theme-error-500, #ef4444)', fontSize: 13 }}>
            ⚠ {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div style={{ padding: 16, borderRadius: 8, border: '1px solid var(--theme-elevation-150, #e2e8f0)', background: 'var(--theme-elevation-50, #f8fafc)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--theme-text, #1e293b)' }}>インポート結果</p>
              <StatusBadge ok={!hasErrors} />
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 13, marginBottom: hasErrors ? 12 : 0 }}>
              <span>合計: <strong>{result.total}</strong> 件</span>
              <span style={{ color: 'var(--theme-success-600, #16a34a)' }}>新規: <strong>{result.created}</strong> 件</span>
              <span style={{ color: 'var(--theme-elevation-600, #4b5563)' }}>更新: <strong>{result.updated}</strong> 件</span>
              <span style={{ color: 'var(--theme-error-600, #dc2626)' }}>エラー: <strong>{result.skipped}</strong> 件</span>
            </div>
            {hasErrors && (
              <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', padding: 10, borderRadius: 6, background: 'var(--theme-error-50, #fef2f2)', border: '1px solid var(--theme-error-200, #fecaca)' }}>
                {result.errors.map((e, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--theme-error-600, #dc2626)', marginBottom: 4 }}>
                    行 {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ImportExportPage() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--theme-text, #1e293b)', margin: 0 }}>
          データ管理
        </h1>
        <p style={{ fontSize: 13, color: 'var(--theme-text-secondary, #64748b)', marginTop: 4 }}>
          注文・商品・顧客データの CSV インポート / エクスポートを行います。
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <ExportSection />
        <div style={{ borderTop: '1px solid var(--theme-elevation-150, #e2e8f0)', paddingTop: 24 }}>
          <ImportSection />
        </div>
      </div>

      {/* Notes */}
      <div style={{ marginTop: 32, padding: 14, borderRadius: 8, background: 'var(--theme-elevation-50, #f8fafc)', border: '1px solid var(--theme-elevation-150, #e2e8f0)' }}>
        <p style={{ fontWeight: 600, fontSize: 12, color: 'var(--theme-text-secondary, #64748b)', marginBottom: 6 }}>注意事項</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--theme-text-secondary, #64748b)', lineHeight: 1.8 }}>
          <li>エクスポートファイルは BOM 付き UTF-8（Excel で開くと文字化けしません）</li>
          <li>注文データのエクスポートのみ対応しています（注文のインポートは不可）</li>
          <li>商品インポート: スラッグ → SKU の順で一致確認し、存在すれば更新・なければ新規作成</li>
          <li>顧客インポート: メールアドレスで一致確認。管理者アカウントは更新されません</li>
          <li>新規顧客にはランダムなパスワードが設定されます（「パスワードを忘れた」から再設定可能）</li>
        </ul>
      </div>
    </div>
  )
}
