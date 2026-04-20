'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { type SenderState } from './SenderBlock'
import { type ShippingTimeSlot } from '@/lib/site-settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecipientState = {
  sameAsSender: boolean
  name: string
  nameKana: string
  phone: string
  postalCode: string
  prefecture: string
  addressLine1: string
  addressLine2: string
  desiredArrivalDate: string
  desiredTimeSlotValue: string
  desiredTimeSlotLabel: string
}

type Props = {
  value: RecipientState
  onChange: (value: RecipientState) => void
  senderSnapshot: SenderState
  availableTimeSlots: ShippingTimeSlot[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PREFECTURES = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecipientBlock({ value, onChange, senderSnapshot, availableTimeSlots }: Props) {
  const handleField = (field: keyof Omit<RecipientState, 'sameAsSender' | 'desiredTimeSlotValue' | 'desiredTimeSlotLabel'>) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onChange({ ...value, [field]: e.target.value })
  }

  const handlePrefecture = (prefecture: string | null) => {
    onChange({ ...value, prefecture: prefecture ?? '' })
  }

  const handleSameAsSender = (same: boolean) => {
    onChange({ ...value, sameAsSender: same })
  }

  const handleTimeSlot = (slotValue: string | null) => {
    if (!slotValue) {
      onChange({ ...value, desiredTimeSlotValue: '', desiredTimeSlotLabel: '' })
      return
    }
    const slot = availableTimeSlots.find((s) => s.value === slotValue)
    onChange({
      ...value,
      desiredTimeSlotValue: slotValue,
      desiredTimeSlotLabel: slot?.label ?? '',
    })
  }

  const sortedTimeSlots = [...availableTimeSlots]
    .filter((s) => s.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold text-brand-dark sm:text-base">送り先情報</h2>

      {/* Radio: same as sender / different */}
      <div className="mb-5 space-y-3">
        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
            value.sameAsSender
              ? 'border-brand-teal bg-brand-teal/5'
              : 'border-border hover:border-brand-teal/40',
          )}
        >
          <input
            type="radio"
            name="recipientSameAsSender"
            checked={value.sameAsSender}
            onChange={() => handleSameAsSender(true)}
            className="mt-1 accent-brand-teal"
          />
          <div className="flex-1">
            <span className="font-semibold text-brand-dark">注文者情報と同じ</span>
          </div>
        </label>

        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
            !value.sameAsSender
              ? 'border-brand-teal bg-brand-teal/5'
              : 'border-border hover:border-brand-teal/40',
          )}
        >
          <input
            type="radio"
            name="recipientSameAsSender"
            checked={!value.sameAsSender}
            onChange={() => handleSameAsSender(false)}
            className="mt-1 accent-brand-teal"
          />
          <div className="flex-1">
            <span className="font-semibold text-brand-dark">別の配送先を指定</span>
          </div>
        </label>
      </div>

      {/* sameAsSender=true: read-only display */}
      {value.sameAsSender && (
        <dl className="mb-5 space-y-2 rounded-lg border border-border/40 bg-muted/30 p-4 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-foreground/60">お名前</dt>
            <dd className="text-brand-dark">{senderSnapshot.name || '未入力'}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-foreground/60">電話番号</dt>
            <dd className="text-brand-dark">{senderSnapshot.phone || '未入力'}</dd>
          </div>
          {(senderSnapshot.prefecture || senderSnapshot.addressLine1) && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-foreground/60">住所</dt>
              <dd className="text-brand-dark">
                {[
                  senderSnapshot.postalCode ? `〒${senderSnapshot.postalCode}` : null,
                  senderSnapshot.prefecture,
                  senderSnapshot.addressLine1,
                  senderSnapshot.addressLine2,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </dd>
            </div>
          )}
        </dl>
      )}

      {/* sameAsSender=false: input form */}
      {!value.sameAsSender && (
        <div className="mb-5 space-y-4">
          <div>
            <Label htmlFor="recipient-name" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              氏名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipient-name"
              placeholder="山田 花子"
              value={value.name}
              onChange={handleField('name')}
              required
              className="text-base sm:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="recipient-name-kana" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              フリガナ
            </Label>
            <Input
              id="recipient-name-kana"
              placeholder="ヤマダ ハナコ"
              value={value.nameKana}
              onChange={handleField('nameKana')}
              className="text-base sm:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="recipient-phone" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              電話番号 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipient-phone"
              type="tel"
              placeholder="09012345678"
              value={value.phone}
              onChange={handleField('phone')}
              required
              className="text-base sm:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="recipient-postal-code" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              郵便番号
            </Label>
            <Input
              id="recipient-postal-code"
              placeholder="1234567"
              value={value.postalCode}
              onChange={handleField('postalCode')}
              className="text-base sm:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="recipient-prefecture" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              都道府県 <span className="text-destructive">*</span>
            </Label>
            <Select value={value.prefecture} onValueChange={handlePrefecture}>
              <SelectTrigger id="recipient-prefecture">
                <SelectValue placeholder="都道府県を選択..." />
              </SelectTrigger>
              <SelectContent>
                {PREFECTURES.map((pref) => (
                  <SelectItem key={pref} value={pref}>
                    {pref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recipient-address-line1" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              市区町村・番地 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipient-address-line1"
              placeholder="渋谷区渋谷 1-2-3"
              value={value.addressLine1}
              onChange={handleField('addressLine1')}
              className="text-base sm:text-sm"
            />
          </div>

          <div>
            <Label htmlFor="recipient-address-line2" className="mb-1.5 block text-sm font-semibold text-brand-dark">
              建物名・部屋番号
            </Label>
            <Input
              id="recipient-address-line2"
              placeholder="○○ビル 101"
              value={value.addressLine2}
              onChange={handleField('addressLine2')}
              className="text-base sm:text-sm"
            />
          </div>
        </div>
      )}

      {/* Desired arrival date — always visible */}
      <div className="mb-4">
        <Label htmlFor="recipient-arrival-date" className="mb-1.5 block text-sm font-semibold text-brand-dark">
          到着希望日
        </Label>
        <Input
          id="recipient-arrival-date"
          type="date"
          value={value.desiredArrivalDate}
          onChange={(e) => onChange({ ...value, desiredArrivalDate: e.target.value })}
          className="text-base sm:text-sm"
        />
      </div>

      {/* Desired time slot — always visible */}
      <div>
        <Label htmlFor="recipient-time-slot" className="mb-1.5 block text-sm font-semibold text-brand-dark">
          希望時間帯
        </Label>
        {sortedTimeSlots.length === 0 ? (
          <p className="text-sm text-foreground/40">選択した配送プランに時間帯設定がありません</p>
        ) : (
          <Select
            value={value.desiredTimeSlotValue}
            onValueChange={handleTimeSlot}
          >
            <SelectTrigger id="recipient-time-slot">
              <SelectValue placeholder="時間帯を選択..." />
            </SelectTrigger>
            <SelectContent>
              {sortedTimeSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </section>
  )
}
