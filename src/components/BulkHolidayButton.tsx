'use client'

import React, { useState, useCallback } from 'react'

const DAYS_OF_WEEK = [
  { value: 0, label: '日曜' },
  { value: 1, label: '月曜' },
  { value: 2, label: '火曜' },
  { value: 3, label: '水曜' },
  { value: 4, label: '木曜' },
  { value: 5, label: '金曜' },
  { value: 6, label: '土曜' },
]

export const BulkHolidayButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [usePattern, setUsePattern] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: number; skipped: number; errors: number } | null>(null)

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  const handleSubmit = useCallback(async () => {
    if (!startDate || !endDate) return
    setIsSubmitting(true)
    setResult(null)

    try {
      const dates: string[] = []
      const start = new Date(startDate)
      const end = new Date(endDate)
      const current = new Date(start)

      while (current <= end) {
        if (usePattern && selectedDays.length > 0) {
          if (selectedDays.includes(current.getDay())) {
            dates.push(current.toISOString().substring(0, 10))
          }
        } else {
          dates.push(current.toISOString().substring(0, 10))
        }
        current.setDate(current.getDate() + 1)
      }

      let success = 0
      let skipped = 0
      let errors = 0

      for (const dateStr of dates) {
        try {
          const res = await fetch('/api/business-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              date: dateStr,
              isHoliday: true,
              holidayReason: reason || undefined,
              shippingAvailable: false,
            }),
          })

          if (res.ok) {
            success++
          } else {
            const data = await res.json().catch(() => ({}))
            if (res.status === 400 && JSON.stringify(data).includes('unique')) {
              skipped++
            } else {
              errors++
            }
          }
        } catch {
          errors++
        }
      }

      setResult({ success, skipped, errors })
    } catch (err) {
      console.error('Bulk holiday error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [startDate, endDate, reason, selectedDays, usePattern])

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setResult(null) }}
        style={{
          padding: '8px 16px',
          backgroundColor: 'var(--theme-elevation-150)',
          color: 'var(--theme-text)',
          border: '1px solid var(--theme-elevation-250)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        一括休業日登録
      </button>

      {isOpen && (
        <div
          style={{
            marginTop: '12px',
            padding: '20px',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: '8px',
            backgroundColor: 'var(--theme-elevation-50)',
            maxWidth: '500px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--theme-text)' }}>
            一括休業日登録
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold', color: 'var(--theme-text)' }}>
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid var(--theme-elevation-250)',
                borderRadius: '4px',
                backgroundColor: 'var(--theme-input-bg)',
                color: 'var(--theme-text)',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold', color: 'var(--theme-text)' }}>
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid var(--theme-elevation-250)',
                borderRadius: '4px',
                backgroundColor: 'var(--theme-input-bg)',
                color: 'var(--theme-text)',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold', color: 'var(--theme-text)' }}>
              休業理由
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例: 年末年始休業"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid var(--theme-elevation-250)',
                borderRadius: '4px',
                backgroundColor: 'var(--theme-input-bg)',
                color: 'var(--theme-text)',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--theme-text)' }}>
              <input
                type="checkbox"
                checked={usePattern}
                onChange={(e) => setUsePattern(e.target.checked)}
              />
              曜日パターンで繰り返し登録
            </label>
          </div>

          {usePattern && (
            <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--theme-elevation-250)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    backgroundColor: selectedDays.includes(day.value)
                      ? 'var(--theme-elevation-500)'
                      : 'var(--theme-elevation-100)',
                    color: selectedDays.includes(day.value)
                      ? '#fff'
                      : 'var(--theme-text)',
                  }}
                >
                  {day.label}
                </button>
              ))}
            </div>
          )}

          {result && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px',
                backgroundColor: result.errors > 0 ? '#fef2f2' : '#f0fdf4',
                borderRadius: '4px',
                fontSize: '14px',
                color: result.errors > 0 ? '#991b1b' : '#166534',
              }}
            >
              登録完了: {result.success}件 / スキップ(重複): {result.skipped}件
              {result.errors > 0 && ` / エラー: ${result.errors}件`}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !startDate || !endDate}
              style={{
                padding: '8px 20px',
                backgroundColor: isSubmitting
                  ? 'var(--theme-elevation-300)'
                  : 'var(--theme-elevation-500)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'default' : 'pointer',
                fontSize: '14px',
              }}
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '8px 20px',
                backgroundColor: 'var(--theme-elevation-100)',
                color: 'var(--theme-text)',
                border: '1px solid var(--theme-elevation-250)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BulkHolidayButton
