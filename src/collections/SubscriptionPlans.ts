import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const SubscriptionPlans: CollectionConfig = {
  slug: 'subscription-plans',
  labels: {
    singular: '定期便プラン',
    plural: '定期便プラン',
  },
  admin: {
    useAsTitle: 'name',
    group: '商品・注文',
    description: '定期便（サブスクリプション）のプラン設定。毎月/隔月/3ヶ月ごとの配送間隔と含まれる商品を設定できます。',
    defaultColumns: ['name', 'interval', 'price', 'status'],
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
      label: 'プラン名',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'スラッグ',
      unique: true,
      required: true,
      index: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'プラン説明',
    },
    {
      name: 'price',
      type: 'number',
      label: '月額/回額（税込）',
      required: true,
      min: 0,
    },
    {
      name: 'interval',
      type: 'select',
      label: '配送間隔',
      required: true,
      options: [
        { label: '毎月', value: 'month' },
        { label: '2ヶ月ごと', value: '2months' },
        { label: '3ヶ月ごと', value: '3months' },
      ],
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: '含まれる商品',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'プラン画像',
    },
    {
      name: 'stripePriceId',
      type: 'text',
      label: 'Stripe Price ID',
      admin: {
        description: 'Stripe管理画面で作成したrecurring priceのID（例: price_xxx）',
        position: 'sidebar',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: '下書き', value: 'draft' },
        { label: '公開', value: 'published' },
        { label: '受付停止', value: 'paused' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
