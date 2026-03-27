import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const SecretSales: CollectionConfig = {
  slug: 'secret-sales',
  labels: {
    singular: 'シークレットセール',
    plural: 'シークレットセール',
  },
  admin: {
    useAsTitle: 'name',
    group: '販促・セール',
    description: 'URL限定セールページの作成。パスワード保護にも対応。SNSやメルマガで特定のお客様だけに公開できます。',
    defaultColumns: ['name', 'accessType', 'status', 'validUntil'],
    listSearchableFields: ['name', 'slug'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'セール名',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'アクセスURL',
      unique: true,
      required: true,
      index: true,
      admin: { description: 'セールページのURL（例: "vip-summer" → /sale/vip-summer）' },
    },
    {
      name: 'accessType',
      type: 'select',
      label: 'アクセス方式',
      required: true,
      defaultValue: 'url_only',
      options: [
        { label: 'URL限定（URLを知っていればアクセス可能）', value: 'url_only' },
        { label: 'パスワード保護', value: 'password' },
      ],
    },
    {
      name: 'password',
      type: 'text',
      label: 'パスワード',
      minLength: 6,
      admin: {
        condition: (data) => data?.accessType === 'password',
        description: '閲覧時に入力が必要なパスワード（6文字以上）。セキュリティのため十分な長さのパスワードを設定してください。',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: 'セール説明',
    },
    {
      name: 'bannerImage',
      type: 'upload',
      relationTo: 'media',
      label: 'バナー画像',
    },
    {
      name: 'products',
      type: 'array',
      label: '対象商品',
      minRows: 1,
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          required: true,
        },
        {
          name: 'salePrice',
          type: 'number',
          label: 'セール価格（税込）',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'validFrom',
      type: 'date',
      label: '開始日時',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        position: 'sidebar',
      },
    },
    {
      name: 'validUntil',
      type: 'date',
      label: '終了日時',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
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
        { label: '公開', value: 'active' },
        { label: '終了', value: 'ended' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
