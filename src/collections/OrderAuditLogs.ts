import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const OrderAuditLogs: CollectionConfig = {
  slug: 'order-audit-logs',
  labels: {
    singular: '注文変更履歴',
    plural: '注文変更履歴',
  },
  admin: {
    group: '商品・注文',
    description: '注文のステータス変更や編集の履歴。誰がいつ何を変更したかを記録しています。',
    defaultColumns: ['order', 'action', 'changedBy', 'createdAt'],
    listSearchableFields: ['action'],
  },
  access: {
    read: isAdmin,
    create: () => true, // Created by hooks
    update: () => false, // Immutable
    delete: isAdmin,
  },
  fields: [
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      label: '注文',
      required: true,
      index: true,
    },
    {
      name: 'action',
      type: 'text',
      label: 'アクション',
      required: true,
      admin: {
        description: '例: ステータス変更: 保留中 → 確認済み',
      },
    },
    {
      name: 'previousStatus',
      type: 'text',
      label: '変更前ステータス',
    },
    {
      name: 'newStatus',
      type: 'text',
      label: '変更後ステータス',
    },
    {
      name: 'changedBy',
      type: 'relationship',
      relationTo: 'users',
      label: '変更者',
    },
    {
      name: 'details',
      type: 'json',
      label: '変更詳細',
      admin: {
        description: '変更されたフィールドの詳細（JSON）',
      },
    },
  ],
}
