import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Promotions: CollectionConfig = {
  slug: 'promotions',
  labels: {
    singular: 'クーポン・割引',
    plural: 'クーポン・割引',
  },
  admin: {
    useAsTitle: 'name',
    group: '販促・セール',
    description: 'クーポンコードや割引キャンペーンの作成。%割引・定額値引き・送料無料に対応。有効期限・利用回数制限の設定も可能です。',
    defaultColumns: ['name', 'code', 'discountType', 'discountValue', 'status', 'validUntil'],
    listSearchableFields: ['name', 'code'],
  },
  access: {
    read: anyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'プロモーション名',
      required: true,
      admin: { description: '管理用名称（例: 「春のキャンペーン」）' },
    },
    {
      name: 'code',
      type: 'text',
      label: 'クーポンコード',
      unique: true,
      index: true,
      admin: { description: 'ユーザーが入力するコード（例: SPRING2026）。未設定の場合は自動適用キャンペーン。' },
    },
    {
      name: 'discountType',
      type: 'select',
      label: '割引タイプ',
      required: true,
      options: [
        { label: '% 割引', value: 'percentage' },
        { label: '定額値引き（円）', value: 'fixed' },
        { label: '送料無料', value: 'free_shipping' },
      ],
    },
    {
      name: 'discountValue',
      type: 'number',
      label: '割引値',
      min: 0,
      admin: {
        description: '%割引の場合は割引率（例: 10 = 10%）、定額の場合は金額（円）。送料無料の場合は不要。',
        condition: (data) => data?.discountType !== 'free_shipping',
      },
    },
    {
      name: 'minOrderAmount',
      type: 'number',
      label: '最低注文金額',
      min: 0,
      admin: { description: 'この金額以上の注文にのみ適用（未設定＝制限なし）' },
    },
    {
      name: 'maxDiscountAmount',
      type: 'number',
      label: '最大割引額（円）',
      min: 0,
      admin: {
        description: '%割引時の上限額（未設定＝上限なし）',
        condition: (data) => data?.discountType === 'percentage',
      },
    },
    {
      name: 'usageLimit',
      type: 'number',
      label: '利用回数上限',
      min: 0,
      admin: { description: '全体の利用回数上限（未設定＝無制限）' },
    },
    {
      name: 'usageCount',
      type: 'number',
      label: '利用回数',
      defaultValue: 0,
      min: 0,
      admin: { readOnly: true },
    },
    {
      name: 'perUserLimit',
      type: 'number',
      label: '一人あたり利用上限',
      min: 0,
      defaultValue: 1,
      admin: { description: '一ユーザーあたりの利用回数上限' },
    },
    {
      name: 'applicableProducts',
      type: 'relationship',
      relationTo: 'products',
      label: '対象商品',
      hasMany: true,
      admin: { description: '未設定の場合は全商品に適用' },
    },
    {
      name: 'validFrom',
      type: 'date',
      label: '有効開始日',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: '有効終了日',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'active',
      required: true,
      options: [
        { label: '有効', value: 'active' },
        { label: '無効', value: 'inactive' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
