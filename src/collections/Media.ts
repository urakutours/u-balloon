import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'メディア',
    plural: 'メディア',
  },
  admin: {
    group: '設定',
    description: '商品画像・バナー・サイト素材のアップロード管理。商品やブログ記事から参照されます。',
  },
  access: {
    read: anyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
