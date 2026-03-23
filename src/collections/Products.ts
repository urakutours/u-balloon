import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
  },
  access: {
    read: anyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: '商品名',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'スラッグ',
      unique: true,
      required: true,
      admin: {
        description: 'URL用スラッグ（商品名から自動生成）',
      },
      hooks: {
        beforeValidate: [
          ({ value, siblingData }) => {
            if (!value && siblingData?.title) {
              return siblingData.title
                .toLowerCase()
                .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
                .replace(/^-|-$/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'price',
      type: 'number',
      label: '基本価格（税込）',
      required: true,
      min: 0,
    },
    {
      name: 'productType',
      type: 'select',
      label: '商品タイプ',
      required: true,
      defaultValue: 'standard',
      options: [
        { label: '通常商品', value: 'standard' },
        { label: 'デリバリー限定', value: 'delivery' },
      ],
    },
    {
      name: 'description',
      type: 'richText',
      label: '商品説明',
    },
    {
      name: 'images',
      type: 'array',
      label: '商品画像',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'customOptions',
      type: 'group',
      label: 'カスタムオプション',
      fields: [
        {
          name: 'subBalloons',
          type: 'array',
          label: 'サブバルーン選択肢',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: '名前',
              required: true,
            },
            {
              name: 'additionalPrice',
              type: 'number',
              label: '追加料金',
              defaultValue: 0,
              min: 0,
            },
          ],
        },
        {
          name: 'letteringAvailable',
          type: 'checkbox',
          label: '文字入れ対応',
          defaultValue: false,
        },
        {
          name: 'letteringPrice',
          type: 'number',
          label: '文字入れ追加料金',
          defaultValue: 0,
          min: 0,
          admin: {
            condition: (data, siblingData) => siblingData?.letteringAvailable,
          },
        },
        {
          name: 'colors',
          type: 'array',
          label: 'カラーバリエーション',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'カラー名',
              required: true,
            },
            {
              name: 'hexCode',
              type: 'text',
              label: 'HEXカラーコード',
              required: true,
            },
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: '下書き', value: 'draft' },
        { label: '公開', value: 'published' },
      ],
    },
  ],
}
