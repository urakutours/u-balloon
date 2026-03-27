import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const Newsletters: CollectionConfig = {
  slug: 'newsletters',
  labels: {
    singular: 'メルマガ配信',
    plural: 'メルマガ配信',
  },
  admin: {
    useAsTitle: 'subject',
    group: 'メルマガ配信',
    description: 'メルマガの作成・テスト送信・一括配信。購読者全員に一斉送信できます。',
    defaultColumns: ['subject', 'status', 'sentAt', 'recipientCount'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'subject',
      type: 'text',
      label: '件名',
      required: true,
    },
    {
      name: 'content',
      type: 'richText',
      label: '本文',
      required: true,
    },
    {
      name: 'previewText',
      type: 'text',
      label: 'プレビューテキスト',
      admin: { description: 'メールクライアントで件名の横に表示される短いテキスト' },
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: '下書き', value: 'draft' },
        { label: '配信予約済み', value: 'scheduled' },
        { label: '配信中', value: 'sending' },
        { label: '配信完了', value: 'sent' },
        { label: '配信失敗', value: 'failed' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'scheduledAt',
      type: 'date',
      label: '配信予定日時',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
        condition: (data) => ['scheduled', 'sending', 'sent'].includes(data?.status || ''),
      },
    },
    {
      name: 'sentAt',
      type: 'date',
      label: '配信日時',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'recipientCount',
      type: 'number',
      label: '配信数',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'testEmail',
      type: 'email',
      label: 'テスト送信先',
      admin: {
        description: '保存前にテスト送信する場合のメールアドレス',
        position: 'sidebar',
      },
    },
  ],
}
