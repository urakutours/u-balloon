'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { GiftWrappingOption, MessageCardTemplate } from '@/lib/site-settings'

export type GiftState = {
  wrappingOptionId: string
  wrappingOptionName: string
  wrappingFee: number
  messageCardTemplateId: string
  messageCardText: string
}

type Props = {
  value: GiftState
  onChange: (value: GiftState) => void
  wrappingOptions: GiftWrappingOption[]
  messageCardTemplates: MessageCardTemplate[]
}

const NO_WRAPPING_ID = ''
const NO_TEMPLATE_ID = ''

export function GiftBlock({ value, onChange, wrappingOptions, messageCardTemplates }: Props) {
  const activeOptions = wrappingOptions
    .filter((o) => o.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const activeTemplates = messageCardTemplates
    .filter((t) => t.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const handleWrappingSelect = (option: { id: string; label: string; feeAmount: number }) => {
    onChange({
      ...value,
      wrappingOptionId: option.id,
      wrappingOptionName: option.label,
      wrappingFee: option.feeAmount,
      // ラッピングなしに戻したときメッセージカードも不要なのでテキストはそのまま保持
    })
  }

  const handleTemplateSelect = (templateId: string | null) => {
    if (!templateId || templateId === NO_TEMPLATE_ID) {
      onChange({ ...value, messageCardTemplateId: NO_TEMPLATE_ID })
      return
    }
    const tmpl = activeTemplates.find((t) => t.id === templateId)
    onChange({
      ...value,
      messageCardTemplateId: templateId,
      messageCardText: tmpl ? tmpl.body : value.messageCardText,
    })
  }

  const handleMessageCardTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...value, messageCardText: e.target.value })
  }

  const noWrappingCard = { id: NO_WRAPPING_ID, label: 'ラッピングなし', feeAmount: 0 }
  const allOptions = [noWrappingCard, ...activeOptions]
  const isWrapping = value.wrappingOptionId !== NO_WRAPPING_ID
  const charCount = value.messageCardText.length

  return (
    <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold text-brand-dark sm:text-base">ギフト設定</h2>

      {/* ラッピングオプション */}
      <div className="space-y-2">
        <Label className="mb-2 block text-sm font-semibold text-brand-dark">ラッピング</Label>
        {allOptions.map((option) => (
          <label
            key={option.id === NO_WRAPPING_ID ? '__none__' : option.id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
              value.wrappingOptionId === option.id
                ? 'border-brand-teal bg-brand-teal/5'
                : 'border-border hover:border-brand-teal/40',
            )}
          >
            <input
              type="radio"
              name="giftWrapping"
              value={option.id}
              checked={value.wrappingOptionId === option.id}
              onChange={() => handleWrappingSelect(option)}
              className="mt-1 accent-brand-teal"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-brand-dark">{option.label}</span>
                <span className="text-sm font-semibold text-brand-dark">
                  {option.feeAmount === 0 ? '無料' : `+¥${option.feeAmount.toLocaleString()}`}
                </span>
              </div>
              {'description' in option && (option as GiftWrappingOption).description && (
                <p className="mt-1 text-sm text-foreground/60">
                  {(option as GiftWrappingOption).description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* メッセージカードテンプレート＆文面 — ラッピングあり時のみ */}
      {isWrapping && (
        <div className="mt-5 space-y-4">
          {/* テンプレート Select — templates が空のときは非表示 */}
          {activeTemplates.length > 0 && (
            <div>
              <Label className="mb-2 block text-sm font-semibold text-brand-dark">
                メッセージカードテンプレート
              </Label>
              <Select
                value={value.messageCardTemplateId || undefined}
                onValueChange={handleTemplateSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="テンプレートを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>
                      {tmpl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* メッセージカード文面 */}
          <div>
            <Label className="mb-2 block text-sm font-semibold text-brand-dark">
              メッセージカード文面
            </Label>
            <Textarea
              placeholder="メッセージカードに印刷する文面を入力してください"
              value={value.messageCardText}
              onChange={handleMessageCardTextChange}
              maxLength={500}
              rows={4}
              className="text-base sm:text-sm"
            />
            <p className="mt-1 text-right text-xs text-foreground/40">
              {charCount} / 500
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
