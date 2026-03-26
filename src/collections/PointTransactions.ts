import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrOwner } from '../access'

export const PointTransactions: CollectionConfig = {
  slug: 'point-transactions',
  labels: {
    singular: 'ポイント履歴',
    plural: 'ポイント履歴',
  },
  admin: {
    useAsTitle: 'description',
    group: '顧客管理',
    description: 'ポイントの付与・使用・調整履歴',
    defaultColumns: ['description', 'user', 'type', 'amount', 'balance', 'createdAt'],
  },
  access: {
    read: isAdminOrOwner('user'),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'ユーザー',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      label: '種別',
      required: true,
      options: [
        { label: '付与', value: 'earn' },
        { label: '使用', value: 'use' },
        { label: '手動調整', value: 'adjust' },
        { label: '失効', value: 'expire' },
        { label: '移行', value: 'migration' },
      ],
    },
    {
      name: 'amount',
      type: 'number',
      label: 'ポイント数',
      required: true,
      admin: {
        description: '付与は正、使用は負',
      },
    },
    {
      name: 'balance',
      type: 'number',
      label: '取引後残高',
      required: true,
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      label: '関連注文',
    },
    {
      name: 'description',
      type: 'text',
      label: '取引の説明',
      required: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: 'ポイント有効期限',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy/MM/dd',
        },
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: '操作者',
      admin: {
        description: '手動調整の場合の操作者',
      },
    },
  ],
}
