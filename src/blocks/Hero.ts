import type { Block } from 'payload'

export const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'ヒーロー', plural: 'ヒーロー' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: '見出し',
      required: true,
    },
    {
      name: 'subheading',
      type: 'text',
      label: 'サブ見出し',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: '背景画像',
    },
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'ボタンテキスト',
    },
    {
      name: 'ctaLink',
      type: 'text',
      label: 'ボタンリンク',
    },
    {
      name: 'overlay',
      type: 'checkbox',
      label: 'オーバーレイ表示',
      defaultValue: true,
    },
  ],
}
