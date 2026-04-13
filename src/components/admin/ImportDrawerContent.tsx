'use client'

import React, { useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportResult = {
  total: number
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: ok
          ? 'var(--theme-success-100, #dcfce7)'
          : 'var(--theme-error-100, #fee2e2)',
        color: ok
          ? 'var(--theme-success-600, #16a34a)'
          : 'var(--theme-error-600, #dc2626)',
      }}
    >
      {ok ? '完了' : 'エラーあり'}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ImportDrawerContentProps {
  collectionSlug: 'products' | 'customers'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportDrawerContent({ collectionSlug }: ImportDrawerContentProps) {
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
      await downloadFile(
        `/api/admin/import/template?type=${collectionSlug}`,
        `${collectionSlug}_template.csv`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'テンプレートのダウンロードに失敗しました')
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('ファイルを選択してください')
      return
    }
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/import/${collectionSlug}`, {
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
    padding: '8px 20px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer',
    border: 'none',
    background: loading
      ? 'var(--theme-elevation-200, #cbd5e1)'
      : 'var(--theme-success-500, #22c55e)',
    color: loading ? 'var(--theme-text-secondary, #64748b)' : 'white',
    opacity: loading ? 0.7 : 1,
  }

  const btnSecondary: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'transparent',
    color: 'var(--theme-text-secondary, #64748b)',
  }

  const hasErrors = (result?.errors?.length ?? 0) > 0
  const label = collectionSlug === 'customers' ? '顧客' : '商品'

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Template download */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--theme-text-secondary, #64748b)' }}>
            {label}データのCSVをインポートします
          </span>
          <button onClick={handleTemplateDownload} style={btnSecondary}>
            テンプレートをダウンロード
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--theme-elevation-200, #cbd5e1)',
            borderRadius: 8,
            padding: '24px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: file
              ? 'var(--theme-success-50, #f0fdf4)'
              : 'var(--theme-elevation-50, #f8fafc)',
            transition: 'background 0.15s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {file ? (
            <p
              style={{
                fontSize: 13,
                color: 'var(--theme-success-600, #16a34a)',
                fontWeight: 600,
              }}
            >
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
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
            {loading ? 'インポート中...' : 'インポート実行'}
          </button>
          {file && (
            <button
              onClick={() => {
                setFile(null)
                setResult(null)
                setError(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              style={btnSecondary}
            >
              クリア
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <p style={{ color: 'var(--theme-error-500, #ef4444)', fontSize: 13 }}>
            {error}
          </p>
        )}

        {/* Result */}
        {result && (
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--theme-elevation-150, #e2e8f0)',
              background: 'var(--theme-elevation-50, #f8fafc)',
            }}
          >
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}
            >
              <p
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--theme-text, #1e293b)',
                }}
              >
                インポート結果
              </p>
              <StatusBadge ok={!hasErrors} />
            </div>
            <div
              style={{
                display: 'flex',
                gap: 20,
                fontSize: 13,
                marginBottom: hasErrors ? 12 : 0,
              }}
            >
              <span>
                合計: <strong>{result.total}</strong> 件
              </span>
              <span style={{ color: 'var(--theme-success-600, #16a34a)' }}>
                新規: <strong>{result.created}</strong> 件
              </span>
              <span style={{ color: 'var(--theme-elevation-600, #4b5563)' }}>
                更新: <strong>{result.updated}</strong> 件
              </span>
              <span style={{ color: 'var(--theme-error-600, #dc2626)' }}>
                エラー: <strong>{result.skipped}</strong> 件
              </span>
            </div>
            {hasErrors && (
              <div
                style={{
                  marginTop: 8,
                  maxHeight: 200,
                  overflowY: 'auto',
                  padding: 10,
                  borderRadius: 6,
                  background: 'var(--theme-error-50, #fef2f2)',
                  border: '1px solid var(--theme-error-200, #fecaca)',
                }}
              >
                {result.errors.map((e, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 12,
                      color: 'var(--theme-error-600, #dc2626)',
                      marginBottom: 4,
                    }}
                  >
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
