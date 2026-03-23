import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
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
