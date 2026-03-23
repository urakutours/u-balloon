import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    read: isAdminOrSelf,
    create: isAdmin,
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
        description: '旧システムからの移行時に保持する追加データ',
      },
    },
  ],
}
