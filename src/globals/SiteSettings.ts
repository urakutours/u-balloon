import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'
import { encrypt, isEncrypted, maskSecret } from '@/lib/encryption'
import { clearSiteSettingsCache } from '@/lib/site-settings'

/** Fields whose values are AES-256-GCM encrypted in the DB. */
const ENCRYPTED_FIELDS = [
  'ga4ServiceAccountKey',
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
    // ─────────────────────────────────────────────────────────────────
    // 会社 / 店舗情報
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: '会社 / 店舗情報',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'companyName',
          type: 'text',
          label: '会社名 / 屋号',
          admin: {
            description: '特定商取引法に基づく表記、フッター等に使用します。',
          },
        },
        {
          name: 'companyRepresentative',
          type: 'text',
          label: '代表者名',
          admin: {
            description: '特定商取引法に基づく表記に使用します。',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'companyPostalCode',
              type: 'text',
              label: '郵便番号',
              admin: {
                placeholder: '〒108-0000',
                width: '30%',
              },
            },
            {
              name: 'companyAddress',
              type: 'text',
              label: '所在地',
              admin: {
                description: '郵便番号以降の住所。',
                width: '70%',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'companyPhone',
              type: 'text',
              label: '電話番号',
              admin: {
                placeholder: '03-0000-0000',
                width: '50%',
              },
            },
            {
              name: 'companyBusinessHours',
              type: 'text',
              label: '営業時間',
              admin: {
                placeholder: '平日 10:00〜17:00（土日祝休み）',
                width: '50%',
              },
            },
          ],
        },
        {
          name: 'companyContactEmail',
          type: 'text',
          label: 'お問い合わせメールアドレス（表示用）',
          admin: {
            placeholder: 'info@example.com',
            description: 'サイト上に表示するお問い合わせ先メールアドレス。メール送信設定の送信元アドレスとは別です。',
          },
          validate: (value: string | null | undefined) => {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              return '有効なメールアドレスを入力してください'
            }
            return true
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────────
    // サイト基本設定
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'サイト基本設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'siteTitle',
          type: 'text',
          label: 'サイト名',
          admin: {
            description: 'ブラウザタイトルのデフォルト値、OGP 等に使用します。',
            placeholder: 'uballoon | バルーンギフト・バルーン電報の通販',
          },
        },
        {
          name: 'siteDescription',
          type: 'textarea',
          label: 'サイト説明文',
          admin: {
            description: 'meta description、OGP description に使用します。SEO に影響します。',
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────────
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
    // ─────────────────────────────────────────────────────────────────
    // 配送設定
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: '配送設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'shippingOriginAddress',
          type: 'text',
          label: '配送起点住所',
          admin: {
            placeholder: '東京都港区',
            description: 'Google Maps Distance Matrix API で距離計算に使用する出発地点。',
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'shippingStandardBaseFee',
              type: 'number',
              label: '通常配送 基本料金（円）',
              admin: { placeholder: '1200', width: '50%' },
            },
            {
              name: 'shippingStandardFreeDistanceKm',
              type: 'number',
              label: '通常配送 無料距離（km）',
              admin: {
                placeholder: '5',
                width: '50%',
                description: 'この距離以内は基本料金のみ。超過分に距離単価が加算されます。',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'shippingDeliveryBaseFee',
              type: 'number',
              label: 'デリバリー配送 基本料金（円）',
              admin: { placeholder: '4500', width: '50%' },
            },
            {
              name: 'shippingDeliveryFreeDistanceKm',
              type: 'number',
              label: 'デリバリー配送 無料距離（km）',
              admin: { placeholder: '10', width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'shippingExtraPerKmFee',
              type: 'number',
              label: '距離超過単価（円/km）',
              admin: {
                placeholder: '200',
                width: '50%',
                description: '無料距離を超えた場合の1kmあたりの追加料金。通常・デリバリー共通。',
              },
            },
            {
              name: 'shippingDeliveryFreeThreshold',
              type: 'number',
              label: 'デリバリー送料無料閾値（円）',
              admin: {
                placeholder: '30000',
                width: '50%',
                description: '注文金額がこの金額以上の場合、デリバリー基本料を無料にする。0で無効。',
              },
            },
          ],
        },
        {
          name: 'shippingRegionalFees',
          type: 'array',
          label: '地域別送料テーブル',
          admin: {
            description: '地域ごとの送料一覧。ご利用ガイドページと特定商取引法ページに表示されます。無料の場合は 0 を入力してください。',
          },
          fields: [
            {
              name: 'region',
              type: 'text',
              label: '地域名',
              required: true,
              admin: {
                placeholder: '例: 関東（東京・神奈川・千葉・埼玉・茨城・栃木・群馬・山梨）',
                width: '55%',
              },
            },
            {
              name: 'fee',
              type: 'number',
              label: '送料（円）',
              required: true,
              admin: {
                description: '無料は 0',
                width: '25%',
              },
            },
            {
              name: 'note',
              type: 'text',
              label: '備考',
              admin: {
                placeholder: '例: 離島は別途見積もり',
                width: '20%',
              },
            },
          ],
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────────
    // 銀行振込設定
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: '銀行振込設定',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'bankName',
              type: 'text',
              label: '銀行名',
              admin: { placeholder: '三菱UFJ銀行', width: '50%' },
            },
            {
              name: 'bankBranchName',
              type: 'text',
              label: '支店名',
              admin: { placeholder: '渋谷支店', width: '50%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'bankAccountType',
              type: 'select',
              label: '口座種別',
              options: [
                { label: '普通', value: 'ordinary' },
                { label: '当座', value: 'checking' },
              ],
              defaultValue: 'ordinary',
              admin: { width: '33%' },
            },
            {
              name: 'bankAccountNumber',
              type: 'text',
              label: '口座番号',
              admin: { placeholder: '1234567', width: '33%' },
            },
            {
              name: 'bankAccountHolder',
              type: 'text',
              label: '口座名義',
              admin: {
                placeholder: 'ユーバルーン（カ',
                width: '34%',
                description: 'カタカナ表記',
              },
            },
          ],
        },
        {
          name: 'bankTransferDeadlineDays',
          type: 'number',
          label: '振込期限（日数）',
          defaultValue: 7,
          admin: {
            description: '注文日から振込期限までの日数。',
          },
        },
      ],
    },
    // ─────────────────────────────────────────────────────────────────
    // SNS / ソーシャルメディア
    // ─────────────────────────────────────────────────────────────────
    {
      type: 'collapsible',
      label: 'SNS / ソーシャルメディア',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'snsInstagramUrl',
          type: 'text',
          label: 'Instagram URL',
          admin: { placeholder: 'https://www.instagram.com/yourname/' },
        },
        {
          name: 'snsLineUrl',
          type: 'text',
          label: 'LINE公式アカウント URL',
          admin: { placeholder: 'https://line.me/R/ti/p/@xxx' },
        },
        {
          name: 'snsXUrl',
          type: 'text',
          label: 'X（Twitter）URL',
          admin: {
            placeholder: 'https://x.com/yourname',
            description: '未設定の場合、フッターに表示されません。',
          },
        },
        {
          name: 'snsFacebookUrl',
          type: 'text',
          label: 'Facebook URL',
          admin: {
            placeholder: 'https://www.facebook.com/yourpage',
            description: '未設定の場合、フッターに表示されません。',
          },
        },
        {
          name: 'snsTiktokUrl',
          type: 'text',
          label: 'TikTok URL',
          admin: {
            placeholder: 'https://www.tiktok.com/@yourname',
            description: '未設定の場合、フッターに表示されません。',
          },
        },
        {
          name: 'snsYoutubeUrl',
          type: 'text',
          label: 'YouTube URL',
          admin: {
            placeholder: 'https://www.youtube.com/@yourname',
            description: '未設定の場合、フッターに表示されません。',
          },
        },
      ],
    },
  ],
}
