import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrOwner } from '../access'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: {
    singular: '定期便契約',
    plural: '定期便契約',
  },
  admin: {
    group: '商品・注文',
    description: 'お客様ごとの定期便契約状況。次回請求日・ステータス（有効/一時停止/解約）を確認できます。',
    defaultColumns: ['customer', 'plan', 'status', 'nextBillingDate'],
  },
  access: {
    read: isAdminOrOwner('customer'),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      relationTo: 'users',
      label: '顧客',
      required: true,
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'subscription-plans',
      label: 'プラン',
      required: true,
    },
    {
      name: 'stripeSubscriptionId',
      type: 'text',
      label: 'Stripe Subscription ID',
      unique: true,
      index: true,
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      label: 'Stripe Customer ID',
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'active',
      required: true,
      options: [
        { label: '有効', value: 'active' },
        { label: '一時停止', value: 'paused' },
        { label: 'キャンセル済み', value: 'cancelled' },
        { label: '支払い失敗', value: 'past_due' },
      ],
    },
    {
      name: 'currentPeriodStart',
      type: 'date',
      label: '現在の請求期間（開始）',
    },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      label: '現在の請求期間（終了）',
    },
    {
      name: 'nextBillingDate',
      type: 'date',
      label: '次回請求日',
      admin: { position: 'sidebar' },
    },
    {
      name: 'cancelledAt',
      type: 'date',
      label: 'キャンセル日',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.status === 'cancelled',
      },
    },
  ],
}
