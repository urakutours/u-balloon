import type { Block } from 'payload'

export const FAQBlock: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQ' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: '見出し',
    },
    {
      name: 'items',
      type: 'array',
      label: '質問と回答',
      minRows: 1,
      fields: [
        {
          name: 'question',
          type: 'text',
          label: '質問',
          required: true,
        },
        {
          name: 'answer',
          type: 'richText',
          label: '回答',
          required: true,
        },
      ],
    },
  ],
}
