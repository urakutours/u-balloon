'use client'

import React, { useState } from 'react'
import { useTheme } from '@payloadcms/ui'

export interface HelpToggleProps {
  buttonLabel?: string
  content: string
}

/**
 * Renders help content with:
 * - Lines starting with ■ or 【...】 → bold heading with extra top margin
 * - URLs → <a> links opening in new tab
 * - Empty lines → spacer
 */
function renderContent(text: string): React.ReactNode {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const isHeading = /^[■【]/.test(line)
        const isEmpty = line.trim().length === 0
        // Split on URLs to make them clickable
        const parts = line.split(/(https?:\/\/[^\s）)]+)/)
        return (
          <div
            key={li}
            style={{
              fontWeight: isHeading ? 600 : 400,
              marginTop: isHeading && li > 0 ? 12 : 0,
              minHeight: isEmpty ? '0.5em' : undefined,
              whiteSpace: 'pre-wrap',
            }}
          >
            {parts.map((part, pi) =>
              /^https?:\/\//.test(part) ? (
                <a
                  key={pi}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#6366f1', wordBreak: 'break-all' }}
                >
                  {part}
                </a>
              ) : (
                <span key={pi}>{part}</span>
              ),
            )}
          </div>
        )
      })}
    </>
  )
}

export function HelpToggle({ buttonLabel = '設定方法を見る', content }: HelpToggleProps) {
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const panelBg = dark ? '#1e293b' : '#f8fafc'
  const panelBorder = dark ? '#334155' : '#e2e8f0'

  return (
    <div style={{ marginTop: 4, marginBottom: 20 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          fontSize: 13,
          color: '#6366f1',
          cursor: 'pointer',
          border: 'none',
          background: 'none',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            fontSize: 9,
            display: 'inline-block',
            transition: 'transform 0.2s',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          ▶
        </span>
        {buttonLabel}
      </button>
      <div
        style={{
          maxHeight: open ? 2000 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div
          style={{
            marginTop: 8,
            padding: 16,
            background: panelBg,
            borderRadius: 8,
            border: `1px solid ${panelBorder}`,
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          {renderContent(content)}
        </div>
      </div>
    </div>
  )
}
