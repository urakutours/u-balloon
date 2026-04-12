import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { ja } from '@payloadcms/translations/languages/ja'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { OrderAuditLogs } from './collections/OrderAuditLogs'
import { BusinessCalendar } from './collections/BusinessCalendar'
import { PointTransactions } from './collections/PointTransactions'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Forms } from './collections/Forms'
import { FormSubmissions } from './collections/FormSubmissions'
import { Promotions } from './collections/Promotions'
import { SecretSales } from './collections/SecretSales'
import { EmailTemplates } from './collections/EmailTemplates'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { Newsletters } from './collections/Newsletters'
import { SubscriptionPlans } from './collections/SubscriptionPlans'
import { Subscriptions } from './collections/Subscriptions'
import { ABTests } from './collections/ABTests'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.PAYLOAD_SECRET) {
  throw new Error('[PayloadCMS] PAYLOAD_SECRET environment variable is required. Run: openssl rand -base64 32')
}

const s3Plugins = process.env.R2_BUCKET
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.R2_BUCKET,
        config: {
          endpoint: process.env.R2_ENDPOINT,
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
          },
          region: 'auto',
        },
      }),
    ]
  : []

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'all',
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' | U BALLOON 管理画面',
    },
    components: {
      Nav: '@/components/admin/CustomNav',
      views: {
        dashboard: {
          Component: '@/components/admin/Dashboard',
        },
        'data-management': {
          Component: '@/components/admin/ImportExportPage',
          path: '/data-management',
        },
      },
    },
  },
  i18n: {
    supportedLanguages: { ja },
    fallbackLanguage: 'ja',
  },
  collections: [Products, Orders, OrderAuditLogs, SubscriptionPlans, Subscriptions, Users, PointTransactions, Pages, Posts, Forms, FormSubmissions, Promotions, SecretSales, ABTests, NewsletterSubscribers, Newsletters, Media, BusinessCalendar, EmailTemplates],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || process.env.DATABASE_URI || '',
      ssl: {
        rejectUnauthorized: false,
      },
    },
  }),
  sharp,
  plugins: [...s3Plugins],
})
