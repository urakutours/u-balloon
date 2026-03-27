'use client'

import React from 'react'

/**
 * Custom cell component for FormSubmissions 'data' field.
 * Displays JSON data as formatted key-value pairs instead of raw JSON.
 */
const FormSubmissionDataCell: React.FC<{ cellData: unknown }> = ({ cellData }) => {
  if (!cellData || typeof cellData !== 'object') {
    return <span style={{ color: 'var(--ub-text-muted, #94a3b8)', fontSize: '0.8125rem' }}>—</span>
  }

  const entries = Object.entries(cellData as Record<string, unknown>).filter(
    ([, v]) => v != null && v !== '',
  )

  if (entries.length === 0) {
    return <span style={{ color: 'var(--ub-text-muted, #94a3b8)', fontSize: '0.8125rem' }}>（空）</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8125rem', lineHeight: '1.4' }}>
      {entries.slice(0, 3).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', gap: '4px' }}>
          <span style={{ fontWeight: 600, color: 'var(--ub-text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
            {key}:
          </span>
          <span style={{ color: 'var(--ub-text-primary, #303636)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
            {String(value)}
          </span>
        </div>
      ))}
      {entries.length > 3 && (
        <span style={{ color: 'var(--ub-text-muted, #94a3b8)' }}>…他{entries.length - 3}件</span>
      )}
    </div>
  )
}

export default FormSubmissionDataCell
