'use client'

import React, { useState, useCallback } from 'react'
import { useField, useTheme } from '@payloadcms/ui'
import type { TextareaFieldClientComponent } from 'payload'

const MASK_PREFIX = '••••'

/**
 * Custom Field component for encrypted textarea fields.
 *
 * - When a value is saved (masked by afterRead hook), shows masked display
 *   with a "変更する" button.
 * - When editing or no value exists, shows a normal textarea.
 * - On save, the beforeChange hook in SiteSettings encrypts new plaintext
 *   values and preserves the original when the mask is submitted unchanged.
 */
const EncryptedTextField: TextareaFieldClientComponent = ({ path, field }) => {
  const { value, setValue } = useField<string>({ path })
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const isMasked = typeof value === 'string' && value.startsWith(MASK_PREFIX)
  const hasValue = typeof value === 'string' && value.length > 0
  const [editing, setEditing] = useState(false)

  const handleStartEdit = useCallback(() => {
    setEditing(true)
    setValue('')
  }, [setValue])

  const handleCancel = useCallback(() => {
    setEditing(false)
    setValue(MASK_PREFIX) // sentinel — beforeChange preserves original
  }, [setValue])

  const label = field?.label ?? 'サービスアカウント秘密鍵（JSON）'
  const description = field?.admin?.description

  const borderColor = dark ? '#334155' : '#d1d5db'
  const bgColor = dark ? '#1e293b' : '#ffffff'
  const textColor = dark ? '#e2e8f0' : '#1f2937'
  const mutedColor = dark ? '#94a3b8' : '#6b7280'
  const successColor = '#22c55e'

  // ── Masked display mode ──
  if (isMasked && !editing) {
    return (
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 8 }}>
          {label as string}
        </label>
        <div
          style={{
            padding: '10px 14px',
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            background: dark ? '#0f172a' : '#f9fafb',
            fontFamily: 'monospace',
            fontSize: 13,
            color: mutedColor,
            letterSpacing: 1,
          }}
        >
          {value}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={handleStartEdit}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#6366f1',
              background: 'none',
              border: '1px solid #6366f1',
              borderRadius: 5,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            変更する
          </button>
          <span style={{ fontSize: 12, color: successColor, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={successColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            秘密鍵が設定されています
          </span>
        </div>
      </div>
    )
  }

  // ── Edit / new input mode ──
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 8 }}>
        {label as string}
      </label>
      <textarea
        value={hasValue && !isMasked ? (value ?? '') : ''}
        onChange={(e) => setValue(e.target.value)}
        placeholder='{"type":"service_account","project_id":"...","private_key":"..."}'
        rows={5}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: `1px solid ${borderColor}`,
          borderRadius: 6,
          background: bgColor,
          color: textColor,
          fontFamily: 'monospace',
          fontSize: 12,
          lineHeight: 1.6,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
        {editing && (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              fontSize: 12,
              color: mutedColor,
              background: 'none',
              border: `1px solid ${borderColor}`,
              borderRadius: 5,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            キャンセル
          </button>
        )}
        <span style={{ fontSize: 11, color: mutedColor }}>
          {description as string ?? 'JSON キーを貼り付けてください。保存時に暗号化されます。'}
        </span>
      </div>
    </div>
  )
}

export default EncryptedTextField
