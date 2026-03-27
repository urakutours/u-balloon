import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrOwner } from '../access'

export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  labels: {
    singular: 'お問い合わせ受信',
    plural: 'お問い合わせ受信',
  },
  admin: {
    group: 'サイト管理',
    description: 'フォームから送信されたデータの一覧。お問い合わせ内容の確認に使用します。',
    defaultColumns: ['form', 'createdAt'],
  },
  access: {
    read: isAdmin,
    create: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      label: 'フォーム',
      required: true,
    },
    {
      name: 'data',
      type: 'json',
      label: '送信データ',
      required: true,
    },
    {
      name: 'submitterEmail',
      type: 'text',
      label: '送信者メール',
      admin: {
        description: '自動取得（emailフィールドがある場合）',
      },
    },
  ],
}
