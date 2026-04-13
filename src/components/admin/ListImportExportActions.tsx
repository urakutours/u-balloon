'use client'

import React, { useState, useEffect } from 'react'
import { Drawer, DrawerToggler } from '@payloadcms/ui'
import ImportDrawerContent from './ImportDrawerContent'

// ─── Constants ────────────────────────────────────────────────────────────────

const IMPORT_DRAWER_SLUG = 'import-csv-drawer'

// ─── Component ───────────────────────────────────────────────────────────────

export default function ListImportExportActions() {
  const [exporting, setExporting] = useState(false)
  // useEffect で slug を判定 — SSR/クライアントの差異をなくしてハイドレーションミスマッチを防ぐ
  const [collectionSlug, setCollectionSlug] = useState<'products' | 'customers'>('products')

  useEffect(() => {
    // /admin/collections/users → 'customers'
    // /admin/collections/products → 'products'
    if (window.location.pathname.includes('/users')) {
      setCollectionSlug('customers')
    } else {
      setCollectionSlug('products')
    }
  }, [])

  const drawerTitle =
    collectionSlug === 'customers' ? '顧客データ インポート' : '商品データ インポート'

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/admin/export/${collectionSlug}?format=csv`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${collectionSlug}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  const buttonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 12px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    border: '1px solid var(--theme-elevation-200, #cbd5e1)',
    background: 'var(--theme-elevation-0, #ffffff)',
    color: 'var(--theme-text, #1e293b)',
    lineHeight: 1.4,
  }

  const exportButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: exporting ? 0.6 : 1,
    cursor: exporting ? 'not-allowed' : 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <DrawerToggler slug={IMPORT_DRAWER_SLUG} style={{ all: 'unset' }}>
        <button style={buttonStyle}>インポート</button>
      </DrawerToggler>

      <button onClick={handleExport} disabled={exporting} style={exportButtonStyle}>
        {exporting ? 'エクスポート中...' : 'エクスポート'}
      </button>

      <Drawer slug={IMPORT_DRAWER_SLUG} title={drawerTitle}>
        <ImportDrawerContent collectionSlug={collectionSlug} />
      </Drawer>
    </div>
  )
}
