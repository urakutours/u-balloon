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
    defaultColumns: ['form', 'submitterEmail', 'status', 'createdAt'],
    listSearchableFields: ['submitterEmail'],
  },
  access: {
    read: isAdmin,
    create: () => true,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      // resolved に初めて移行した時だけ respondedAt を自動セット。
      // 既に resolved のレコードを再保存しても上書きしない。
      ({ data, originalDoc }) => {
        if (
          data.status === 'resolved' &&
          originalDoc?.status !== 'resolved' &&
          !data.respondedAt
        ) {
          data.respondedAt = new Date().toISOString()
        }
        return data
      },
    ],
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
      admin: {
        components: {
          Cell: '@/components/admin/FormSubmissionDataCell',
        },
      },
    },
    {
      name: 'submitterEmail',
      type: 'text',
      label: '送信者メール',
      admin: {
        description: '自動取得（emailフィールドがある場合）',
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      required: true,
      defaultValue: 'new',
      options: [
        { label: '未対応', value: 'new' },
        { label: '対応中', value: 'in_progress' },
        { label: '対応済み', value: 'resolved' },
      ],
    },
    {
      name: 'respondedAt',
      type: 'date',
      label: '対応日時',
      required: false,
      admin: {
        description: '対応済みにした日時（自動記録）',
      },
    },
  ],
}
