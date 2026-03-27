import type { Block } from 'payload'

export const GalleryBlock: Block = {
  slug: 'gallery',
  labels: { singular: 'ギャラリー', plural: 'ギャラリー' },
  fields: [
    {
      name: 'heading',
      type: 'text',
      label: '見出し',
    },
    {
      name: 'images',
      type: 'array',
      label: '画像一覧',
      minRows: 1,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
          label: 'キャプション',
        },
      ],
    },
    {
      name: 'columns',
      type: 'select',
      label: '列数',
      defaultValue: '3',
      options: [
        { label: '2列', value: '2' },
        { label: '3列', value: '3' },
        { label: '4列', value: '4' },
      ],
    },
  ],
}
