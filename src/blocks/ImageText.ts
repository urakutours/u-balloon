import type { Block } from 'payload'

export const ImageTextBlock: Block = {
  slug: 'imageText',
  labels: { singular: '画像+テキスト', plural: '画像+テキスト' },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: '画像',
      required: true,
    },
    {
      name: 'heading',
      type: 'text',
      label: '見出し',
    },
    {
      name: 'text',
      type: 'richText',
      label: 'テキスト',
      required: true,
    },
    {
      name: 'layout',
      type: 'select',
      label: 'レイアウト',
      defaultValue: 'imageLeft',
      options: [
        { label: '画像左・テキスト右', value: 'imageLeft' },
        { label: 'テキスト左・画像右', value: 'imageRight' },
      ],
    },
  ],
}
