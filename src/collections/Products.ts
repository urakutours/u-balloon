import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: '商品',
    plural: '商品',
  },
  admin: {
    useAsTitle: 'title',
    group: '商品・注文',
    description: 'バルーンギフト商品の登録・編集・在庫管理。商品名・SKU・価格・カスタムオプション・在庫数を管理できます。',
    listSearchableFields: ['title', 'sku', 'slug'],
    defaultColumns: ['title', 'sku', 'price', 'productType', 'popularityScore', 'status'],
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
      name: 'sku',
      type: 'text',
      label: 'SKU',
      unique: true,
      index: true,
      admin: {
        description: 'Shopify SKU（例: g-btd-0001）',
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
        { label: '通常商品（発送）', value: 'standard' },
        { label: 'デリバリー限定', value: 'delivery' },
      ],
    },
    {
      name: 'tags',
      type: 'json',
      label: 'タグ',
      admin: {
        description: 'タグの配列（例: ["誕生日", "動物"]）',
      },
    },
    {
      name: 'shopifyHandle',
      type: 'text',
      label: 'Shopify Handle',
      index: true,
      admin: {
        description: 'Shopifyとのリンク用',
      },
    },
    {
      name: 'bodyHtml',
      type: 'textarea',
      label: '商品説明（HTML）',
      admin: {
        description: 'Shopifyからインポートした商品説明HTML',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: '商品説明（リッチテキスト）',
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
    // --- Shopify互換カスタムオプション ---
    {
      name: 'customOptions',
      type: 'group',
      label: 'カスタムオプション',
      fields: [
        {
          name: 'selectOptions',
          type: 'array',
          label: 'セレクトオプション',
          admin: {
            description: '商品ごとの選択肢グループ（例: カラー、フリンジ、インサイダーバルーン等）',
          },
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'オプション名',
              required: true,
              admin: {
                description: '例: "A インサイダーバルーン", "B フリンジ"',
              },
            },
            {
              name: 'required',
              type: 'checkbox',
              label: '必須',
              defaultValue: false,
            },
            {
              name: 'choices',
              type: 'array',
              label: '選択肢',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  label: '表示名',
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
          ],
        },
        {
          name: 'textInputs',
          type: 'array',
          label: 'テキスト入力',
          admin: {
            description: '名入れ文字、カスタマイズ内容等のテキスト入力フィールド',
          },
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'ラベル',
              required: true,
              admin: {
                description: '例: "名入れ文字", "カスタマイズ内容"',
              },
            },
            {
              name: 'required',
              type: 'checkbox',
              label: '必須',
              defaultValue: false,
            },
            {
              name: 'placeholder',
              type: 'text',
              label: 'プレースホルダ',
            },
            {
              name: 'price',
              type: 'number',
              label: '追加料金',
              defaultValue: 0,
              min: 0,
            },
          ],
        },
      ],
    },
    {
      name: 'stock',
      type: 'number',
      label: '在庫数',
      min: 0,
      admin: {
        description: '現在の在庫数。0の場合「品切れ」表示になります。未設定の場合は在庫制限なし。',
        position: 'sidebar',
      },
    },
    {
      name: 'lowStockThreshold',
      type: 'number',
      label: '在庫アラート閾値',
      min: 0,
      defaultValue: 5,
      admin: {
        description: 'この数以下になるとアラート通知が送られます',
        position: 'sidebar',
      },
    },
    {
      name: 'popularityScore',
      type: 'number',
      label: '人気スコア',
      defaultValue: 0,
      min: 0,
      index: true,
      admin: {
        description: '注文数に応じて自動加算。手動で調整も可能（値が大きいほど「おすすめ順」で上位に表示）',
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
        { label: '公開', value: 'published' },
      ],
    },
  ],
}
