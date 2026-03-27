import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'
import {
  HeroBlock,
  RichContentBlock,
  ImageTextBlock,
  GalleryBlock,
  CTABlock,
  FAQBlock,
  SpacerBlock,
} from '../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: '固定ページ',
    plural: '固定ページ',
  },
  admin: {
    useAsTitle: 'title',
    group: 'サイト管理',
    description: '会社概要・特商法・プライバシーポリシー等の固定ページ管理。ブロックを組み合わせて自由にレイアウトできます。',
    defaultColumns: ['title', 'pageType', 'slug', 'status', 'updatedAt'],
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
      label: 'ページタイトル',
      required: true,
    },
    {
      name: 'pageType',
      type: 'select',
      label: 'ページ種別',
      admin: {
        description: 'サイト固定ページの場合は種別を選択してください。選択するとそのページのURLに自動的に表示されます。',
        position: 'sidebar',
      },
      options: [
        { label: '会社概要（/about）', value: 'about' },
        { label: '特定商取引法（/legal）', value: 'legal' },
        { label: 'プライバシーポリシー（/privacy）', value: 'privacy' },
        { label: 'ご利用ガイド（/delivery）', value: 'delivery' },
        { label: 'お問い合わせ（/contact）', value: 'contact' },
      ],
    },
    {
      name: 'slug',
      type: 'text',
      label: 'スラッグ（URL）',
      unique: true,
      required: true,
      index: true,
      admin: {
        description: 'URLパス。ページ種別を選択した場合は自動設定されます。カスタムページの場合は /pages/スラッグ でアクセスできます。',
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
      name: 'layout',
      type: 'blocks',
      label: 'ページコンテンツ',
      blocks: [
        HeroBlock,
        RichContentBlock,
        ImageTextBlock,
        GalleryBlock,
        CTABlock,
        FAQBlock,
        SpacerBlock,
      ],
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
          admin: { description: '未設定時はページタイトルを使用' },
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'メタディスクリプション',
          maxLength: 160,
          admin: { description: '検索結果に表示される説明文（160文字以内推奨）' },
        },
        {
          name: 'ogImage',
          type: 'upload',
          relationTo: 'media',
          label: 'OGP画像',
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
      admin: { position: 'sidebar' },
    },
  ],
}
