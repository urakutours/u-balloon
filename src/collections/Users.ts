import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf, anyone } from '../access'
import { afterUserCreate } from '../hooks/userHooks'
import { beforeUserPointsChange } from '../hooks/pointAdjustHook'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'ユーザー',
    plural: 'ユーザー',
  },
  admin: {
    useAsTitle: 'email',
    group: '顧客',
    description: '会員・管理者アカウントの一覧。ポイント残高の確認・手動調整もここから行えます。',
    defaultColumns: ['email', 'name', 'role', 'points', 'phone', 'createdAt'],
    listSearchableFields: ['email', 'name', 'phone'],
  },
  auth: true,
  hooks: {
    beforeChange: [beforeUserPointsChange],
    afterChange: [afterUserCreate],
  },
  access: {
    read: isAdminOrSelf,
    create: anyone, // Allow self-registration from frontend
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      required: true,
      options: [
        { label: '管理者', value: 'admin' },
        { label: '顧客', value: 'customer' },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'name',
      type: 'text',
      label: '氏名',
    },
    {
      name: 'phone',
      type: 'text',
      label: '電話番号',
    },
    {
      name: 'defaultAddress',
      type: 'text',
      label: 'デフォルト配送先住所',
    },
    {
      name: 'points',
      type: 'number',
      label: '保有ポイント残高',
      defaultValue: 0,
      admin: {
        description: '管理画面から編集可能',
      },
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'legacyId',
      type: 'text',
      label: 'MakeShop移行用ID',
      unique: true,
      index: true,
      admin: {
        description: 'MakeShopからの移行用ID',
      },
    },
    {
      name: 'legacyData',
      type: 'json',
      label: '旧システム移行データ',
      admin: {
        position: 'sidebar',
        description: '旧システムからの移行時に保持する追加データ',
        condition: (data) => {
          return data?.legacyData != null && data.legacyData !== '' && data.legacyData !== 'null'
        },
        readOnly: true,
      },
    },
    {
      name: 'totalOrders',
      type: 'number',
      label: '累計注文数',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'この顧客の注文件数',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            if (!data?.id || !req.payload) return 0
            try {
              const result = await req.payload.find({
                collection: 'orders',
                where: { customer: { equals: data.id } },
                limit: 0,
                depth: 0,
              })
              return result.totalDocs
            } catch {
              return 0
            }
          },
        ],
      },
    },
    {
      name: 'totalSpent',
      type: 'number',
      label: '累計購入金額',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'この顧客の注文合計金額（円）',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            if (!data?.id || !req.payload) return 0
            try {
              const result = await req.payload.find({
                collection: 'orders',
                where: {
                  and: [
                    { customer: { equals: data.id } },
                    { status: { not_equals: 'cancelled' } },
                  ],
                },
                limit: 500,
                depth: 0,
              })
              return result.docs.reduce(
                (sum, order) => sum + ((order.totalAmount as number) || 0),
                0,
              )
            } catch {
              return 0
            }
          },
        ],
      },
    },
  ],
}
