'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

export type UsageInfo = {
  eventName: string
  usageDate: string
  usageTimeText: string
}

type Props = {
  value: UsageInfo
  onChange: (value: UsageInfo) => void
}

export function UsageDateBlock({ value, onChange }: Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const selectedDate = value.usageDate ? parseISO(value.usageDate) : undefined

  const handleDateSelect = (date: Date | undefined) => {
    onChange({ ...value, usageDate: date ? format(date, 'yyyy-MM-dd') : '' })
    setDatePickerOpen(false)
  }

  const handleField =
    (field: keyof UsageInfo) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, [field]: e.target.value })
    }

  return (
    <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold text-brand-dark sm:text-base">使用日時</h2>
      <div className="space-y-4">

        {/* イベント名 */}
        <div>
          <Label htmlFor="usage-event-name" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            イベント名（任意）
          </Label>
          <Input
            id="usage-event-name"
            placeholder="例: 誕生日パーティー、発表会"
            value={value.eventName}
            onChange={handleField('eventName')}
            className="text-base sm:text-sm"
          />
        </div>

        {/* 使用日 */}
        <div>
          <Label className="mb-1.5 block text-sm font-semibold text-brand-dark">
            使用日（任意）
          </Label>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-accent"
                />
              }
            >
              <CalendarIcon className="h-4 w-4 text-foreground/40" />
              <span className={selectedDate ? 'text-foreground' : 'text-foreground/40'}>
                {selectedDate
                  ? format(selectedDate, 'yyyy年M月d日(E)', { locale: ja })
                  : '日付を選択...'}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border-0"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 使用時間 */}
        <div>
          <Label htmlFor="usage-time-text" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            使用時間（任意）
          </Label>
          <Input
            id="usage-time-text"
            placeholder="例: 14:00 ごろ、午後"
            value={value.usageTimeText}
            onChange={handleField('usageTimeText')}
            className="text-base sm:text-sm"
          />
          <p className="mt-1.5 text-xs text-foreground/40">
            ※ 使用予定の時間です。配送の希望時間とは別です
          </p>
        </div>

      </div>
    </section>
  )
}
