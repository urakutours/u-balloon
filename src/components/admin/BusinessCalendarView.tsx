'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  parseISO,
} from 'date-fns'
import { ja } from 'date-fns/locale'

interface CalendarEntry {
  id: string
  date: string
  isHoliday: boolean
  shippingAvailable: boolean
  holidayReason: string
  note: string
}

type PaintMode = 'holiday' | 'noShip' | 'clear'

interface PendingChange {
  date: string
  action: 'create' | 'update' | 'delete'
  payload?: Record<string, unknown>
  existingId?: string
}

interface PatternRule {
  id: string
  days: number[]
  type: 'holiday' | 'noShip'
  startDate: string
  entryIds: string[]
}

const DAYS_OF_WEEK = [
  { value: 0, label: '日' },
  { value: 1, label: '月' },
  { value: 2, label: '火' },
  { value: 3, label: '水' },
  { value: 4, label: '木' },
  { value: 5, label: '金' },
  { value: 6, label: '土' },
]

const DAY_LABELS: Record<number, string> = {
  0: '日', 1: '月', 2: '火', 3: '水', 4: '木', 5: '金', 6: '土',
}

export default function BusinessCalendarView() {
  const [entries, setEntries] = useState<Map<string, CalendarEntry>>(new Map())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [paintMode, setPaintMode] = useState<PaintMode>('holiday')

  // Pending changes (local, not yet saved)
  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map())
  const [localOverrides, setLocalOverrides] = useState<Map<string, { isHoliday: boolean; shippingAvailable: boolean } | null>>(new Map())
  const [saving, setSaving] = useState(false)

  // Pattern registration state
  const [patternOpen, setPatternOpen] = useState(false)
  const [patternStart, setPatternStart] = useState('')
  const [patternDays, setPatternDays] = useState<number[]>([])
  const [patternType, setPatternType] = useState<'holiday' | 'noShip'>('holiday')
  const [patternSubmitting, setPatternSubmitting] = useState(false)
  const [patternRules, setPatternRules] = useState<PatternRule[]>([])
  const [deletingPattern, setDeletingPattern] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Hide unwanted Payload UI elements via persistent <style> tag
  useEffect(() => {
    const styleId = 'ub-calendar-hide-styles'
    if (document.getElementById(styleId)) return

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Hide Payload list UI when calendar view is active */
      .collection-list .table { display: none !important; }
      .collection-list .collection-list__no-results { display: none !important; }
      .list-controls { display: none !important; }
      a[href*="/business-calendar/create"] { display: none !important; }
      .collection-list__header .pill { display: none !important; }
    `
    document.head.appendChild(style)

    return () => {
      const el = document.getElementById(styleId)
      el?.remove()
    }
  }, [])

  const fetchEntries = useCallback(async (month: Date) => {
    setLoading(true)
    try {
      const start = format(startOfMonth(month), 'yyyy-MM-dd')
      const end = format(endOfMonth(addMonths(month, 1)), 'yyyy-MM-dd')
      const res = await fetch(
        `/api/business-calendar?where[date][greater_than_equal]=${start}&where[date][less_than_equal]=${end}&limit=200&sort=date`,
        { credentials: 'include' },
      )
      if (res.ok) {
        const data = await res.json()
        const map = new Map<string, CalendarEntry>()
        for (const doc of data.docs) {
          const dateStr = (doc.date as string).substring(0, 10)
          map.set(dateStr, {
            id: doc.id,
            date: dateStr,
            isHoliday: doc.isHoliday ?? false,
            shippingAvailable: doc.shippingAvailable ?? true,
            holidayReason: doc.holidayReason || '',
            note: doc.note || '',
          })
        }
        setEntries(map)
      }
    } catch (err) {
      console.error('Calendar fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries(currentMonth)
  }, [currentMonth, fetchEntries])

  // Handle day click: apply local changes without saving
  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const existing = entries.get(dateStr)
    const localState = localOverrides.get(dateStr)

    // Determine current effective state
    const effectiveIsHoliday = localState !== undefined
      ? (localState === null ? false : localState.isHoliday)
      : (existing?.isHoliday ?? false)
    const effectiveShipAvail = localState !== undefined
      ? (localState === null ? true : localState.shippingAvailable)
      : (existing?.shippingAvailable ?? true)

    const newOverrides = new Map(localOverrides)
    const newChanges = new Map(pendingChanges)

    if (paintMode === 'clear') {
      if (existing && localState !== null) {
        newOverrides.set(dateStr, null)
        newChanges.set(dateStr, { date: dateStr, action: 'delete', existingId: existing.id })
      } else if (!existing && localState !== undefined) {
        newOverrides.delete(dateStr)
        newChanges.delete(dateStr)
      }
    } else if (paintMode === 'holiday') {
      if (effectiveIsHoliday) {
        if (existing) {
          newOverrides.set(dateStr, null)
          newChanges.set(dateStr, { date: dateStr, action: 'delete', existingId: existing.id })
        } else {
          newOverrides.delete(dateStr)
          newChanges.delete(dateStr)
        }
      } else {
        const newState = { isHoliday: true, shippingAvailable: false }
        newOverrides.set(dateStr, newState)
        if (existing) {
          newChanges.set(dateStr, { date: dateStr, action: 'update', existingId: existing.id, payload: newState })
        } else {
          newChanges.set(dateStr, { date: dateStr, action: 'create', payload: { date: dateStr, ...newState } })
        }
      }
    } else if (paintMode === 'noShip') {
      if (!effectiveShipAvail && !effectiveIsHoliday) {
        if (existing) {
          newOverrides.set(dateStr, null)
          newChanges.set(dateStr, { date: dateStr, action: 'delete', existingId: existing.id })
        } else {
          newOverrides.delete(dateStr)
          newChanges.delete(dateStr)
        }
      } else {
        const newState = { isHoliday: false, shippingAvailable: false }
        newOverrides.set(dateStr, newState)
        if (existing) {
          newChanges.set(dateStr, { date: dateStr, action: 'update', existingId: existing.id, payload: newState })
        } else {
          newChanges.set(dateStr, { date: dateStr, action: 'create', payload: { date: dateStr, ...newState } })
        }
      }
    }

    setLocalOverrides(newOverrides)
    setPendingChanges(newChanges)
  }

  // Save all pending changes
  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [, change] of pendingChanges) {
        if (change.action === 'delete' && change.existingId) {
          await fetch(`/api/business-calendar/${change.existingId}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        } else if (change.action === 'update' && change.existingId) {
          await fetch(`/api/business-calendar/${change.existingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(change.payload),
          })
        } else if (change.action === 'create') {
          await fetch('/api/business-calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(change.payload),
          })
        }
      }
      setPendingChanges(new Map())
      setLocalOverrides(new Map())
      await fetchEntries(currentMonth)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Cancel all pending changes
  const handleCancel = () => {
    setPendingChanges(new Map())
    setLocalOverrides(new Map())
  }

  // Pattern registration
  const handlePatternSubmit = async () => {
    if (!patternStart || patternDays.length === 0) return
    setPatternSubmitting(true)

    const start = new Date(patternStart)
    const end = new Date(start)
    end.setFullYear(end.getFullYear() + 1)

    const dates: string[] = []
    const current = new Date(start)
    while (current <= end) {
      if (patternDays.includes(current.getDay())) {
        dates.push(current.toISOString().substring(0, 10))
      }
      current.setDate(current.getDate() + 1)
    }

    const createdIds: string[] = []

    for (const dateStr of dates) {
      try {
        const res = await fetch('/api/business-calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            date: dateStr,
            isHoliday: patternType === 'holiday',
            shippingAvailable: false,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          createdIds.push(data.doc?.id || data.id)
        }
      } catch {
        // skip errors (e.g. duplicate dates)
      }
    }

    if (createdIds.length > 0) {
      const rule: PatternRule = {
        id: `${Date.now()}`,
        days: [...patternDays],
        type: patternType,
        startDate: patternStart,
        entryIds: createdIds,
      }
      setPatternRules((prev) => [...prev, rule])
    }

    setPatternSubmitting(false)
    setPatternDays([])
    setPatternStart('')
    await fetchEntries(currentMonth)
  }

  // Delete a pattern rule and all its entries
  const handleDeletePattern = async (ruleId: string) => {
    const rule = patternRules.find((r) => r.id === ruleId)
    if (!rule) return
    setDeletingPattern(ruleId)

    for (const entryId of rule.entryIds) {
      try {
        await fetch(`/api/business-calendar/${entryId}`, {
          method: 'DELETE',
          credentials: 'include',
        })
      } catch {
        // skip
      }
    }

    setPatternRules((prev) => prev.filter((r) => r.id !== ruleId))
    setDeletingPattern(null)
    await fetchEntries(currentMonth)
  }

  // Build modifiers: merge server entries with local overrides
  const holidayDates: Date[] = []
  const noShipDates: Date[] = []

  entries.forEach((entry, dateStr) => {
    const override = localOverrides.get(dateStr)
    if (override === null) return // marked for deletion
    const effective = override ?? entry
    const d = parseISO(dateStr)
    if (effective.isHoliday) holidayDates.push(d)
    if (!effective.shippingAvailable && !effective.isHoliday) noShipDates.push(d)
  })

  // Also include newly created (local only) entries
  localOverrides.forEach((override, dateStr) => {
    if (override === null) return
    if (entries.has(dateStr)) return // already handled above
    const d = parseISO(dateStr)
    if (override.isHoliday) holidayDates.push(d)
    if (!override.shippingAvailable && !override.isHoliday) noShipDates.push(d)
  })

  const hasPendingChanges = pendingChanges.size > 0

  // Stats summary
  const stats = useMemo(() => {
    let holidays = 0
    let noShipDays = 0
    entries.forEach((entry, dateStr) => {
      const override = localOverrides.get(dateStr)
      if (override === null) return
      const effective = override ?? entry
      if (effective.isHoliday) holidays++
      else if (!effective.shippingAvailable) noShipDays++
    })
    localOverrides.forEach((override, dateStr) => {
      if (override === null || entries.has(dateStr)) return
      if (override.isHoliday) holidays++
      else if (!override.shippingAvailable) noShipDays++
    })
    return { holidays, noShipDays }
  }, [entries, localOverrides])

  return (
    <div className="ub-calendar-view" ref={containerRef}>
      {/* Calendar Stats */}
      <div className="ub-calendar-stats">
        <div className="ub-calendar-stat">
          <span className="ub-calendar-stat__dot" style={{ background: '#ef4444' }} />
          <span className="ub-calendar-stat__label">休業日</span>
          <span className="ub-calendar-stat__count">{stats.holidays}日</span>
        </div>
        <div className="ub-calendar-stat">
          <span className="ub-calendar-stat__dot" style={{ background: '#f97316' }} />
          <span className="ub-calendar-stat__label">発送不可日</span>
          <span className="ub-calendar-stat__count">{stats.noShipDays}日</span>
        </div>
        {hasPendingChanges && (
          <div className="ub-calendar-stat">
            <span className="ub-change-count">{pendingChanges.size}件の未保存変更</span>
          </div>
        )}
      </div>

      {/* Mode selector toolbar */}
      <div className="ub-mode-toolbar">
        <span className="ub-mode-label">塗りモード:</span>
        <div className="ub-mode-buttons">
          <button
            type="button"
            onClick={() => setPaintMode('holiday')}
            className={`ub-mode-btn ub-mode-btn--holiday ${paintMode === 'holiday' ? 'ub-mode-btn--active' : ''}`}
          >
            <span className="ub-mode-dot ub-mode-dot--holiday" />
            休業日
          </button>
          <button
            type="button"
            onClick={() => setPaintMode('noShip')}
            className={`ub-mode-btn ub-mode-btn--no-ship ${paintMode === 'noShip' ? 'ub-mode-btn--active' : ''}`}
          >
            <span className="ub-mode-dot ub-mode-dot--no-ship" />
            発送不可
          </button>
          <button
            type="button"
            onClick={() => setPaintMode('clear')}
            className={`ub-mode-btn ub-mode-btn--clear ${paintMode === 'clear' ? 'ub-mode-btn--active' : ''}`}
          >
            <span className="ub-mode-dot ub-mode-dot--clear" />
            解除
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="ub-card">
        {loading && (
          <div className="ub-loading">
            <div className="ub-spinner" />
            カレンダーを読み込み中...
          </div>
        )}
        <DayPicker
          mode="single"
          onSelect={(date) => date && handleDayClick(date)}
          onMonthChange={setCurrentMonth}
          month={currentMonth}
          numberOfMonths={2}
          locale={ja}
          modifiers={{
            holiday: holidayDates,
            noShip: noShipDates,
          }}
          modifiersClassNames={{
            holiday: 'ub-day--holiday',
            noShip: 'ub-day--no-ship',
            selected: 'ub-day--selected',
            today: 'ub-day--today',
          }}
          classNames={{
            root: 'ub-rdp',
            months: 'ub-rdp-months',
            month_grid: 'ub-rdp-month-grid',
            nav: 'ub-rdp-nav',
            button_next: 'ub-rdp-nav-btn',
            button_previous: 'ub-rdp-nav-btn',
            month_caption: 'ub-rdp-caption',
            day_button: 'ub-rdp-day-btn',
            day: 'ub-rdp-day',
            weekday: 'ub-rdp-weekday',
            weekdays: 'ub-rdp-weekdays',
            week: 'ub-rdp-week',
            today: 'ub-rdp-today',
            selected: 'ub-rdp-selected',
          }}
        />
        {/* Legend */}
        <div className="ub-calendar-legend">
          <span className="ub-legend-item">
            <span className="ub-legend-dot ub-legend-dot--holiday" />
            休業日
          </span>
          <span className="ub-legend-item">
            <span className="ub-legend-dot ub-legend-dot--no-ship" />
            発送不可
          </span>
          <span className="ub-legend-item">
            <span className="ub-legend-dot ub-legend-dot--today" />
            本日
          </span>
        </div>

        {/* Save / Cancel bar */}
        {hasPendingChanges && (
          <div className="ub-save-bar">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ub-btn ub-btn--primary"
            >
              {saving ? '保存中...' : `保存（${pendingChanges.size}件の変更）`}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="ub-btn ub-btn--secondary"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>

      {/* Pattern registration (below calendar) */}
      <div className="ub-card ub-pattern-section">
        <button
          type="button"
          onClick={() => setPatternOpen(!patternOpen)}
          className={`ub-pattern-toggle ${patternOpen ? 'ub-pattern-toggle--open' : ''}`}
        >
          <span className="ub-card-title" style={{ margin: 0 }}>
            <span className="ub-card-title-icon">🔄</span>
            曜日パターンで繰り返し登録
          </span>
          <span className="ub-pattern-toggle__arrow">
            {patternOpen ? '▲' : '▼'}
          </span>
        </button>
        {patternOpen && (
          <div style={{ marginTop: '1.25rem' }}>
            {/* Day of week selector */}
            <div className="ub-form-group">
              <label className="ub-form-label">登録する曜日を選択</label>
              <div className="ub-day-selector">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setPatternDays((prev) =>
                        prev.includes(day.value)
                          ? prev.filter((d) => d !== day.value)
                          : [...prev, day.value],
                      )
                    }
                    className={`ub-day-btn ${patternDays.includes(day.value) ? 'ub-day-btn--active' : ''}`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ub-pattern-fields">
              <div className="ub-form-group">
                <label className="ub-form-label">開始日</label>
                <input
                  type="date"
                  value={patternStart}
                  onChange={(e) => setPatternStart(e.target.value)}
                  className="ub-input"
                />
              </div>
              <div className="ub-form-group">
                <label className="ub-form-label">種別</label>
                <div className="ub-mode-buttons" style={{ gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setPatternType('holiday')}
                    className={`ub-mode-btn ub-mode-btn--holiday ${patternType === 'holiday' ? 'ub-mode-btn--active' : ''}`}
                  >
                    休業日
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatternType('noShip')}
                    className={`ub-mode-btn ub-mode-btn--no-ship ${patternType === 'noShip' ? 'ub-mode-btn--active' : ''}`}
                  >
                    発送不可
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePatternSubmit}
              disabled={patternSubmitting || !patternStart || patternDays.length === 0}
              className="ub-btn ub-btn--primary"
            >
              {patternSubmitting ? '登録中...' : '繰り返し登録（開始日から1年間）'}
            </button>

            {/* Pattern rules list */}
            {patternRules.length > 0 && (
              <div className="ub-pattern-list">
                <h4 className="ub-pattern-list-title">登録済みパターン</h4>
                {patternRules.map((rule) => (
                  <div key={rule.id} className="ub-pattern-item">
                    <div className="ub-pattern-item-info">
                      <span className={`ub-badge ${rule.type === 'holiday' ? 'ub-badge--holiday' : 'ub-badge--no-ship'}`}>
                        {rule.type === 'holiday' ? '休業' : '発送不可'}
                      </span>
                      <span>
                        毎週 {rule.days.sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join('・')}
                      </span>
                      <span className="ub-muted-text" style={{ fontSize: '0.8125rem' }}>
                        {rule.startDate}〜 / {rule.entryIds.length}件
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePattern(rule.id)}
                      disabled={deletingPattern === rule.id}
                      className="ub-btn ub-btn--danger"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8125rem' }}
                    >
                      {deletingPattern === rule.id ? '削除中...' : '一括削除'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export { BusinessCalendarView }
