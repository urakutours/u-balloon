import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'
import { encrypt, isEncrypted, maskSecret } from '@/lib/encryption'

/** Fields whose values are AES-256-GCM encrypted in the DB. */
const ENCRYPTED_FIELDS = ['ga4ServiceAccountKey']

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'サイト設定',
  admin: {
    group: 'サイト管理',
    description: 'GA4連携やサイト全体の設定を管理します。',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  hooks: {
    // ── Encrypt plaintext secrets before writing to DB ──
    beforeChange: [
      async ({ data, originalDoc }) => {
        if (!data) return data
        for (const field of ENCRYPTED_FIELDS) {
          const value = data[field]
          if (!value || (typeof value === 'string' && value.startsWith('••••'))) {
            // Masked or empty — preserve the original encrypted value from DB
            data[field] = originalDoc?.[field] ?? null
          } else if (typeof value === 'string' && !isEncrypted(value)) {
            // New plaintext — encrypt before saving
            data[field] = encrypt(value)
          }
          // Already encrypted — leave as-is
        }
        return data
      },
    ],
    // ── Mask secrets for admin UI (unless server-side asks for raw) ──
    afterRead: [
      async ({ doc, context }) => {
        // Server-side callers pass { rawSecrets: true } to get encrypted values
        // which they then decrypt themselves.
        if (context?.rawSecrets) return doc
        for (const field of ENCRYPTED_FIELDS) {
          const value = doc[field]
          if (typeof value === 'string' && value.length > 0) {
            doc[field] = maskSecret(value)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'collapsible',
      label: 'Google Analytics 4',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'ga4MeasurementId',
          label: 'GA4 測定ID',
          type: 'text',
          admin: {
            placeholder: 'G-XXXXXXXXXX',
            description:
              'Google Analytics 4 の測定ID。「G-」で始まる文字列を入力してください。フロントエンドに gtag.js が自動挿入されます。',
          },
          validate: (value: string | null | undefined) => {
            if (value && !/^G-[A-Z0-9]+$/.test(value)) {
              return 'GA4測定IDは「G-」で始まる英数字です（例: G-ABC123DEF4）'
            }
            return true
          },
        },
        {
          name: 'ga4MeasurementIdHelp',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/fields/GA4MeasurementIdHelp',
            },
          },
        },
        {
          name: 'ga4PropertyId',
          label: 'GA4 プロパティID',
          type: 'text',
          admin: {
            placeholder: '123456789',
            description:
              'GA4 Data API でデータ取得するためのプロパティID（数字のみ）。Google Analytics の管理画面 > プロパティ設定で確認できます。',
          },
          validate: (value: string | null | undefined) => {
            if (value && !/^\d+$/.test(value)) {
              return 'プロパティIDは数字のみです'
            }
            return true
          },
        },
        {
          name: 'ga4PropertyIdHelp',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/fields/GA4PropertyIdHelp',
            },
          },
        },
        {
          name: 'ga4ServiceAccountEmail',
          label: 'サービスアカウントメール',
          type: 'text',
          admin: {
            placeholder: 'xxxxx@project-id.iam.gserviceaccount.com',
            description:
              'GA4 Data API 用のサービスアカウントメールアドレス。',
          },
        },
        {
          name: 'ga4ServiceAccountEmailHelp',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/fields/GA4ServiceAccountHelp',
            },
          },
        },
        {
          name: 'ga4ServiceAccountKey',
          label: 'サービスアカウント秘密鍵（JSON）',
          type: 'textarea',
          admin: {
            placeholder:
              '{"type":"service_account","project_id":"...","private_key":"..."}',
            description:
              'Google Cloud Console からダウンロードした JSON キーの内容を貼り付けてください。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
      ],
    },
  ],
}
