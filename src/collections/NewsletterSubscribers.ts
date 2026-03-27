import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: {
    singular: 'メルマガ購読者',
    plural: 'メルマガ購読者',
  },
  admin: {
    useAsTitle: 'email',
    group: 'メルマガ配信',
    description: 'メルマガを受け取っている購読者の一覧。ステータス（購読中/解除済み/バウンス）の確認ができます。',
    defaultColumns: ['email', 'name', 'status', 'source', 'createdAt'],
  },
  access: {
    read: isAdmin,
    create: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'メールアドレス',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'name',
      type: 'text',
      label: '名前',
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'active',
      required: true,
      options: [
        { label: '購読中', value: 'active' },
        { label: '配信停止', value: 'unsubscribed' },
        { label: 'バウンス', value: 'bounced' },
      ],
    },
    {
      name: 'source',
      type: 'select',
      label: '登録元',
      defaultValue: 'website',
      options: [
        { label: 'ウェブサイト', value: 'website' },
        { label: '会員登録', value: 'registration' },
        { label: '管理者追加', value: 'admin' },
        { label: 'インポート', value: 'import' },
      ],
    },
    {
      name: 'unsubscribeToken',
      type: 'text',
      label: '配信停止トークン',
      unique: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (!value) {
              return `unsub_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`
            }
            return value
          },
        ],
      },
      admin: { readOnly: true },
    },
  ],
}
