import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { ja } from '@payloadcms/translations/languages/ja'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { payloadEmailAdapter } from './lib/payload-email-adapter'
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

// VERCEL_URL is the actual deployment URL (preview-specific on previews).
// VERCEL_PROJECT_PRODUCTION_URL is the configured production domain — it is
// set on ALL deployments (including previews) to the same production URL,
// so we must not treat it as the preview's own URL.
const vercelDeploymentUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined

// On preview deployments, serverURL must point to *this* preview so that
// generated links (forgot-password reset URL, embed snippets, etc.) resolve
// back to the same database/code revision. NEXT_PUBLIC_APP_URL is shared
// across all environments and would otherwise route preview emails to
// production, where the new code may not yet be merged.
const isVercelPreview = process.env.VERCEL_ENV === 'preview'

const resolvedServerURL = (() => {
  if (isVercelPreview && vercelDeploymentUrl) return vercelDeploymentUrl
  if (
    process.env.NEXT_PUBLIC_APP_URL &&
    !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
  ) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return vercelProductionUrl || vercelDeploymentUrl || process.env.NEXT_PUBLIC_APP_URL || ''
})()

const allowedOrigins = [
  resolvedServerURL,
  process.env.NEXT_PUBLIC_APP_URL,
  vercelDeploymentUrl,
  vercelProductionUrl,
  'https://u-balloon.vercel.app',
  'https://u-balloon.com',
  'https://www.u-balloon.com',
  'http://localhost:3000',
].filter((v): v is string => Boolean(v))

export default buildConfig({
  serverURL: resolvedServerURL,
  cors: allowedOrigins,
  csrf: allowedOrigins,
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
          Component: '@/components/admin/ImportExportView',
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
  email: payloadEmailAdapter,
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
