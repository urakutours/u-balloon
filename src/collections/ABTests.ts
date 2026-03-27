import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const ABTests: CollectionConfig = {
  slug: 'ab-tests',
  labels: {
    singular: 'A/Bテスト',
    plural: 'A/Bテスト',
  },
  admin: {
    useAsTitle: 'name',
    group: '販促・セール',
    description: '商品ページの見た目を最大4パターンで比較テスト。どのデザインが最もコンバージョンするか検証できます。',
    defaultColumns: ['name', 'product', 'status', 'createdAt'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'テスト名',
      required: true,
      admin: { description: '例: 「誕生日バルーン ヒーロー画像テスト」' },
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: '対象商品',
      required: true,
    },
    {
      name: 'variants',
      type: 'array',
      label: 'バリアント',
      minRows: 2,
      maxRows: 4,
      fields: [
        {
          name: 'variantId',
          type: 'text',
          label: 'バリアントID',
          required: true,
          admin: { description: '例: "A", "B", "C", "D"' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'バリアント説明',
          required: true,
          admin: { description: '例: 「ピンク背景ヒーロー」' },
        },
        {
          name: 'weight',
          type: 'number',
          label: 'トラフィック配分（%）',
          required: true,
          min: 0,
          max: 100,
          defaultValue: 50,
        },
        {
          name: 'heroImage',
          type: 'upload',
          relationTo: 'media',
          label: 'ヒーロー画像（上書き）',
        },
        {
          name: 'headingOverride',
          type: 'text',
          label: '見出し上書き',
        },
        {
          name: 'descriptionOverride',
          type: 'textarea',
          label: '説明文上書き',
        },
        {
          name: 'ctaText',
          type: 'text',
          label: 'CTAボタンテキスト上書き',
        },
        {
          name: 'impressions',
          type: 'number',
          label: '表示回数',
          defaultValue: 0,
          admin: { readOnly: true },
        },
        {
          name: 'conversions',
          type: 'number',
          label: 'コンバージョン数',
          defaultValue: 0,
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: '下書き', value: 'draft' },
        { label: '実行中', value: 'running' },
        { label: '終了', value: 'completed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'winnerVariant',
      type: 'text',
      label: '勝者バリアント',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'completed',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      label: '開始日',
      admin: { position: 'sidebar' },
    },
    {
      name: 'endedAt',
      type: 'date',
      label: '終了日',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'completed',
      },
    },
  ],
}
