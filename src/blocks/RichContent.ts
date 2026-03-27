import type { Block } from 'payload'

export const RichContentBlock: Block = {
  slug: 'richContent',
  labels: { singular: 'リッチテキスト', plural: 'リッチテキスト' },
  fields: [
    {
      name: 'content',
      type: 'richText',
      label: '本文',
      required: true,
    },
  ],
}
