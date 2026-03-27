import type { Block } from 'payload'

export const CTABlock: Block = {
  slug: 'cta',
  labels: { singular: 'CTA（行動喚起）', plural: 'CTA' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: '見出し',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      label: '説明文',
    },
    {
      name: 'buttons',
      type: 'array',
      label: 'ボタン',
      minRows: 1,
      maxRows: 3,
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'ボタンテキスト',
          required: true,
        },
        {
          name: 'link',
          type: 'text',
          label: 'リンクURL',
          required: true,
        },
        {
          name: 'variant',
          type: 'select',
          label: 'スタイル',
          defaultValue: 'primary',
          options: [
            { label: 'プライマリ', value: 'primary' },
            { label: 'セカンダリ', value: 'secondary' },
            { label: 'アウトライン', value: 'outline' },
          ],
        },
      ],
    },
    {
      name: 'background',
      type: 'select',
      label: '背景色',
      defaultValue: 'white',
      options: [
        { label: '白', value: 'white' },
        { label: 'ブランドカラー', value: 'brand' },
        { label: 'グレー', value: 'gray' },
      ],
    },
  ],
}
