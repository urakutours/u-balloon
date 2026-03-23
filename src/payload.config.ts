import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { BusinessCalendar } from './collections/BusinessCalendar'
import { PointTransactions } from './collections/PointTransactions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Products, Orders, BusinessCalendar, PointTransactions],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'default-secret-change-me-in-production-32chars',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      ssl: {
        rejectUnauthorized: false,
      },
    },
  }),
  sharp,
  plugins: [],
})
