import type { GlobalConfig } from 'payload'
import { isAdmin } from '../access'

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
              'GA4 Data API 用のサービスアカウントメールアドレス。秘密鍵は環境変数 GA4_SERVICE_ACCOUNT_KEY で設定してください。',
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
      ],
    },
  ],
}
