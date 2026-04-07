import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'
import { encrypt, isEncrypted, maskSecret } from '@/lib/encryption'
import { clearSiteSettingsCache } from '@/lib/site-settings'

/** Fields whose values are AES-256-GCM encrypted in the DB. */
const ENCRYPTED_FIELDS = [
  'ga4ServiceAccountKey',
  'stripeSecretKey',
  'stripeWebhookSecret',
  'stripeTestPublishableKey',
  'stripeTestSecretKey',
  'stripeTestWebhookSecret',
  'stripeLivePublishableKey',
  'stripeLiveSecretKey',
  'stripeLiveWebhookSecret',
  'resendApiKey',
  'googleMapsApiKey',
]

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

        // ── Validate: switching to live requires all live keys ──
        if (data.stripeMode === 'live') {
          const liveKeyFields = ['stripeLiveSecretKey', 'stripeLiveWebhookSecret', 'stripeLivePublishableKey']
          const isKeyConfigured = (f: string): boolean => {
            const val = data[f]
            const orig = (originalDoc as Record<string, unknown> | null)?.[f]
            // New plaintext input (not masked)
            if (typeof val === 'string' && val.length > 0 && !val.startsWith('••••')) return true
            // Preserved masked value AND original exists in DB
            if (typeof orig === 'string' && orig.length > 0) return true
            return false
          }
          if (!liveKeyFields.every(isKeyConfigured)) {
            throw new Error('本番モードに切り替えるには、本番環境の全てのキーを設定してください')
          }
        }

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
    // ── Invalidate in-memory cache when settings are saved ──
    afterChange: [
      async () => {
        clearSiteSettingsCache()
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
    // ─────────────────────────────────────────────────────────────────
    // 決済設定 (Stripe)
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: '決済設定（Stripe）',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'stripeMode',
          type: 'select',
          label: '決済モード',
          defaultValue: 'test',
          options: [
            { label: 'テストモード', value: 'test' },
            { label: '本番モード', value: 'live' },
          ],
          admin: {
            description: 'テストモードでは Stripe のテスト環境を使用します。実際の決済は行われません。',
            components: {
              Field: '@/components/admin/fields/StripeModeSwitch',
            },
          },
        },
        // ─── テスト環境 ───
        {
          name: 'stripeTestPublishableKey',
          label: 'テスト公開可能キー',
          type: 'text',
          admin: {
            placeholder: 'pk_test_...',
            description: 'Stripe テスト環境の公開可能キー（pk_test_ で始まる）。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
          validate: (value: string | null | undefined) => {
            if (!value || typeof value !== 'string') return true
            if (value.startsWith('••••') || isEncrypted(value)) return true
            if (!value.startsWith('pk_test_')) return 'テスト用公開可能キーには pk_test_ で始まるキーを入力してください'
            return true
          },
        },
        {
          name: 'stripeTestSecretKey',
          label: 'テストシークレットキー',
          type: 'text',
          admin: {
            placeholder: 'sk_test_...',
            description: 'Stripe テスト環境のシークレットキー（sk_test_ または rk_test_ で始まる）。セキュリティ強化のため、制限付きキー（rk_test_）の使用を推奨します。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
          validate: (value: string | null | undefined) => {
            if (!value || typeof value !== 'string') return true
            if (value.startsWith('••••') || isEncrypted(value)) return true
            if (!value.startsWith('sk_test_') && !value.startsWith('rk_test_')) return 'テストシークレットキーには sk_test_ または rk_test_ で始まるキーを入力してください'
            return true
          },
        },
        {
          name: 'stripeTestWebhookSecret',
          label: 'テスト Webhook シークレット',
          type: 'text',
          admin: {
            placeholder: 'whsec_...',
            description: 'Stripe テスト環境の Webhook シークレット（whsec_ で始まる）。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
        // ─── 本番環境 ───
        {
          name: 'stripeLivePublishableKey',
          label: '本番公開可能キー',
          type: 'text',
          admin: {
            placeholder: 'pk_live_...',
            description: 'Stripe 本番環境の公開可能キー（pk_live_ で始まる）。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
          validate: (value: string | null | undefined) => {
            if (!value || typeof value !== 'string') return true
            if (value.startsWith('••••') || isEncrypted(value)) return true
            if (!value.startsWith('pk_live_')) return '本番用公開可能キーには pk_live_ で始まるキーを入力してください'
            return true
          },
        },
        {
          name: 'stripeLiveSecretKey',
          label: '本番シークレットキー',
          type: 'text',
          admin: {
            placeholder: 'sk_live_...',
            description: 'Stripe 本番環境のシークレットキー（sk_live_ または rk_live_ で始まる）。セキュリティ強化のため、制限付きキー（rk_live_）の使用を推奨します。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
          validate: (value: string | null | undefined) => {
            if (!value || typeof value !== 'string') return true
            if (value.startsWith('••••') || isEncrypted(value)) return true
            if (!value.startsWith('sk_live_') && !value.startsWith('rk_live_')) return '本番シークレットキーには sk_live_ または rk_live_ で始まるキーを入力してください'
            return true
          },
        },
        {
          name: 'stripeLiveWebhookSecret',
          label: '本番 Webhook シークレット',
          type: 'text',
          admin: {
            placeholder: 'whsec_...',
            description: 'Stripe 本番環境の Webhook シークレット（whsec_ で始まる）。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
        // ─── 旧設定（フォールバック用） ───
        {
          name: 'stripeSecretKey',
          label: 'Stripe シークレットキー（旧・フォールバック）',
          type: 'text',
          admin: {
            placeholder: 'sk_live_... または sk_test_...',
            description:
              '旧フィールド。上記テスト/本番キーが設定されるまでのフォールバックとして機能します。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
        {
          name: 'stripeWebhookSecret',
          label: 'Stripe Webhook シークレット（旧・フォールバック）',
          type: 'text',
          admin: {
            placeholder: 'whsec_...',
            description:
              '旧フィールド。上記テスト/本番 Webhook シークレットが設定されるまでのフォールバックとして機能します。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
        {
          name: 'stripeHelp',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/fields/StripeHelp',
            },
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────────
    // メール配信設定 (Resend)
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'メール配信設定（Resend）',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'resendApiKey',
          label: 'Resend API キー',
          type: 'text',
          admin: {
            placeholder: 're_...',
            description:
              'Resend のトランザクションメール送信用 API キー。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
        {
          name: 'emailFromAddress',
          label: '送信元メールアドレス',
          type: 'text',
          admin: {
            placeholder: 'noreply@u-balloon.com',
            description: 'メール送信時の From アドレス。Resend でドメイン認証済みのアドレスを設定してください。',
          },
          validate: (value: string | null | undefined) => {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return '有効なメールアドレスを入力してください'
            }
            return true
          },
        },
        {
          name: 'emailFromName',
          label: '送信者表示名',
          type: 'text',
          admin: {
            placeholder: 'uballoon',
            description: 'メール送信時の差出人名（例: uballoon）。',
          },
        },
        {
          name: 'emailReplyTo',
          label: '返信先メールアドレス',
          type: 'text',
          admin: {
            placeholder: 'info@u-balloon.com',
            description: '顧客がメールに返信したときの宛先アドレス。',
          },
          validate: (value: string | null | undefined) => {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return '有効なメールアドレスを入力してください'
            }
            return true
          },
        },
        {
          name: 'adminAlertEmail',
          label: '管理者通知先メールアドレス',
          type: 'text',
          admin: {
            placeholder: 'admin@u-balloon.com',
            description: '在庫アラート・注文通知などの管理者向けメールを受け取るアドレス。',
          },
          validate: (value: string | null | undefined) => {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return '有効なメールアドレスを入力してください'
            }
            return true
          },
        },
        {
          name: 'emailHelp',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/fields/EmailHelp',
            },
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────────
    // 外部サービス設定 (Google Maps)
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: '外部サービス設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'googleMapsApiKey',
          label: 'Google Maps API キー',
          type: 'text',
          admin: {
            placeholder: 'AIza...',
            description:
              'Distance Matrix API 用のキー。配送料の距離計算に使用します。保存時に自動で暗号化されます。',
            components: {
              Field: '@/components/admin/fields/EncryptedTextField',
            },
          },
        },
        {
          name: 'googleMapsHelp',
          type: 'ui',
          admin: {
            components: {
              Field: '@/components/admin/fields/GoogleMapsHelp',
            },
          },
        },
      ],
    },
  ],
}
