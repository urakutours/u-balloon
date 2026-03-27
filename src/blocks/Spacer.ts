import type { Block } from 'payload'

export const SpacerBlock: Block = {
  slug: 'spacer',
  labels: { singular: 'スペーサー', plural: 'スペーサー' },
  fields: [
    {
      name: 'height',
      type: 'select',
      label: '高さ',
      defaultValue: 'md',
      options: [
        { label: '小（16px）', value: 'sm' },
        { label: '中（32px）', value: 'md' },
        { label: '大（64px）', value: 'lg' },
        { label: '特大（96px）', value: 'xl' },
      ],
    },
  ],
}
