'use client'

import React, { useState } from 'react'
import { useField, useTheme } from '@payloadcms/ui'

type StripeModeProps = {
  path?: string
  field?: {
    label?: string | Record<string, string>
    admin?: {
      description?: string
    }
  }
}

const StripeModeSwitch = ({ path, field }: StripeModeProps) => {
  const { value, setValue } = useField<string>({ path: path ?? 'stripeMode' })
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const currentMode = (value === 'live' ? 'live' : 'test') as 'test' | 'live'
  const [pendingMode, setPendingMode] = useState<'test' | 'live' | null>(null)

  const textColor = dark ? '#e2e8f0' : '#1f2937'
  const mutedColor = dark ? '#94a3b8' : '#6b7280'
  const borderColor = dark ? '#334155' : '#d1d5db'
  const bgInactive = dark ? '#1e293b' : '#f9fafb'

  const handleSelect = (mode: 'test' | 'live') => {
    if (mode === currentMode) return
    setPendingMode(mode)
  }

  const handleConfirm = () => {
    if (pendingMode) setValue(pendingMode)
    setPendingMode(null)
  }

  const handleCancel = () => setPendingMode(null)

  const label = field?.label ?? '決済モード'
  const description = field?.admin?.description

  const dialogTitle = pendingMode === 'live' ? '本番モードへの切り替え' : 'テストモードへの切り替え'
  const dialogMessage =
    pendingMode === 'live'
      ? '本番モードに切り替えます。実際の決済が処理されるようになります。よろしいですか？'
      : 'テストモードに切り替えます。実際の決済は処理されなくなります。よろしいですか？'

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 8 }}>
        {label as string}
      </label>

      {/* Toggle buttons */}
      <div style={{
        display: 'inline-flex',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {(['test', 'live'] as const).map((mode, i) => {
          const isActive = currentMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleSelect(mode)}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: isActive ? 'default' : 'pointer',
                background: isActive
                  ? mode === 'live' ? '#16a34a' : '#d97706'
                  : bgInactive,
                color: isActive ? '#ffffff' : mutedColor,
                border: 'none',
                borderRight: i === 0 ? `1px solid ${borderColor}` : 'none',
                transition: 'background .15s, color .15s',
                fontFamily: 'inherit',
              }}
            >
              {mode === 'test' ? 'テストモード' : '本番モード'}
            </button>
          )
        })}
      </div>

      {/* Status hint */}
      <p style={{ marginTop: 6, fontSize: 11, color: currentMode === 'live' ? '#16a34a' : '#d97706' }}>
        {currentMode === 'live'
          ? '✓ 本番モード — 実際の決済が処理されます'
          : '⚠ テストモード — 実際の決済は行われません'}
      </p>

      {description && (
        <p style={{ marginTop: 4, fontSize: 11, color: mutedColor }}>{description as string}</p>
      )}

      {/* Confirmation overlay */}
      {pendingMode !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: dark ? '#1e293b' : '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '24px 28px',
            maxWidth: 420,
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: textColor }}>
              {dialogTitle}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: mutedColor, lineHeight: 1.6 }}>
              {dialogMessage}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  background: 'none', border: `1px solid ${borderColor}`,
                  borderRadius: 6, cursor: 'pointer',
                  color: mutedColor, fontFamily: 'inherit',
                }}
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  background: pendingMode === 'live' ? '#16a34a' : '#d97706',
                  color: '#ffffff', border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                切り替える
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StripeModeSwitch
