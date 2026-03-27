import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: 'ブログ記事',
    plural: 'ブログ記事',
  },
  admin: {
    useAsTitle: 'title',
    group: 'サイト管理',
    description: 'ブログ記事の作成・管理。お知らせ・コラム・イベント・ガイド・スタッフブログのカテゴリーで公開できます。',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
    listSearchableFields: ['title', 'slug'],
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
      label: '記事タイトル',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'スラッグ',
      unique: true,
      required: true,
      index: true,
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
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      label: 'アイキャッチ画像',
    },
    {
      name: 'excerpt',
      type: 'textarea',
      label: '抜粋',
      maxLength: 200,
      admin: {
        description: '一覧ページで表示される記事の要約（150文字程度）',
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: '本文',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      label: 'カテゴリ',
      defaultValue: 'news',
      options: [
        { label: 'お知らせ', value: 'news' },
        { label: 'コラム', value: 'column' },
        { label: 'イベント', value: 'event' },
        { label: 'バルーンの選び方', value: 'guide' },
        { label: 'スタッフブログ', value: 'staff' },
      ],
    },
    {
      name: 'tags',
      type: 'json',
      label: 'タグ',
      admin: {
        description: 'タグの配列（例: ["誕生日", "結婚式"]）',
      },
    },
    {
      name: 'meta',
      type: 'group',
      label: 'SEO設定',
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'メタタイトル',
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'メタディスクリプション',
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      label: '公開日',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
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
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: '著者',
      admin: { position: 'sidebar' },
    },
  ],
}
