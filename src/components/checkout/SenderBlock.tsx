'use client'

import React from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type SenderState = {
  name: string
  nameKana: string
  email: string
  phone: string
  postalCode: string
  prefecture: string
  addressLine1: string
  addressLine2: string
}

type User = {
  id: string
  email: string
  name?: string
  nameKana?: string
  phone?: string
  mobilePhone?: string
  postalCode?: string
  prefecture?: string
  addressLine1?: string
  addressLine2?: string
  defaultAddress?: string
  points: number
  role: 'admin' | 'customer'
  requirePasswordChange?: boolean
}

type Props = {
  value: SenderState
  onChange: (value: SenderState) => void
  user: User | null
  isGuest: boolean
}

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

export function SenderBlock({ value, onChange, user, isGuest }: Props) {
  const handleField = (field: keyof SenderState) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    onChange({ ...value, [field]: e.target.value })
  }

  const handlePrefecture = (prefecture: string | null) => {
    onChange({ ...value, prefecture: prefecture ?? '' })
  }

  if (!isGuest && user) {
    const address =
      [user.prefecture, user.addressLine1, user.addressLine2]
        .filter(Boolean)
        .join(' ') ||
      user.defaultAddress ||
      '未設定'
    return (
      <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-sm font-bold text-brand-dark sm:text-base">お客様情報</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-foreground/60">お名前</dt>
            <dd className="text-brand-dark">{user.name ?? '未設定'}</dd>
          </div>
          {user.nameKana && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-foreground/60">フリガナ</dt>
              <dd className="text-brand-dark">{user.nameKana}</dd>
            </div>
          )}
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-foreground/60">メール</dt>
            <dd className="text-brand-dark">{user.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-foreground/60">電話番号</dt>
            <dd className="text-brand-dark">{user.phone ?? '未設定'}</dd>
          </div>
          {user.postalCode && (
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-foreground/60">郵便番号</dt>
              <dd className="text-brand-dark">{user.postalCode}</dd>
            </div>
          )}
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-foreground/60">住所</dt>
            <dd className="text-brand-dark">{address}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-foreground/40">
          情報を変更するには{' '}
          <Link href="/account" className="text-brand-teal underline underline-offset-2">
            マイページ
          </Link>{' '}
          からご変更ください。
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold text-brand-dark sm:text-base">お客様情報</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="sender-name" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            氏名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sender-name"
            placeholder="山田 太郎"
            value={value.name}
            onChange={handleField('name')}
            required
            className="text-base sm:text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sender-name-kana" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            フリガナ
          </Label>
          <Input
            id="sender-name-kana"
            placeholder="ヤマダ タロウ"
            value={value.nameKana}
            onChange={handleField('nameKana')}
            className="text-base sm:text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sender-email" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            メールアドレス <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sender-email"
            type="email"
            placeholder="example@mail.com"
            value={value.email}
            onChange={handleField('email')}
            required
            className="text-base sm:text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sender-phone" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            電話番号 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="sender-phone"
            type="tel"
            placeholder="09012345678"
            value={value.phone}
            onChange={handleField('phone')}
            required
            className="text-base sm:text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sender-postal-code" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            郵便番号
          </Label>
          <Input
            id="sender-postal-code"
            placeholder="1234567"
            value={value.postalCode}
            onChange={handleField('postalCode')}
            className="text-base sm:text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sender-prefecture" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            都道府県
          </Label>
          <Select value={value.prefecture} onValueChange={handlePrefecture}>
            <SelectTrigger id="sender-prefecture">
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
          <Label htmlFor="sender-address-line1" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            市区町村・番地
          </Label>
          <Input
            id="sender-address-line1"
            placeholder="渋谷区渋谷 1-2-3"
            value={value.addressLine1}
            onChange={handleField('addressLine1')}
            className="text-base sm:text-sm"
          />
        </div>

        <div>
          <Label htmlFor="sender-address-line2" className="mb-1.5 block text-sm font-semibold text-brand-dark">
            建物名・部屋番号
          </Label>
          <Input
            id="sender-address-line2"
            placeholder="○○ビル 101"
            value={value.addressLine2}
            onChange={handleField('addressLine2')}
            className="text-base sm:text-sm"
          />
        </div>
      </div>
    </section>
  )
}
