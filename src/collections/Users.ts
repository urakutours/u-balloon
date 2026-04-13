import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf, anyone } from '../access'
import { afterUserCreate } from '../hooks/userHooks'
import { beforeUserPointsChange } from '../hooks/pointAdjustHook'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'ユーザー',
    plural: 'ユーザー',
  },
  admin: {
    useAsTitle: 'email',
    group: '顧客',
    description: '会員・管理者アカウントの一覧。ポイント残高の確認・手動調整もここから行えます。',
    defaultColumns: ['email', 'name', 'nameKana', 'role', 'points', 'phone', 'prefecture', 'createdAt'],
    listSearchableFields: ['email', 'name', 'nameKana', 'phone', 'legacyId'],
    components: {
      beforeListTable: ['@/components/admin/ListImportExportActions'],
    },
  },
  auth: true,
  hooks: {
    beforeChange: [beforeUserPointsChange],
    afterChange: [afterUserCreate],
  },
  access: {
    read: isAdminOrSelf,
    create: anyone, // Allow self-registration from frontend
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    // グループ1（常時表示）
    {
      name: 'role',
      type: 'select',
      defaultValue: 'customer',
      required: true,
      options: [
        { label: '管理者', value: 'admin' },
        { label: '顧客', value: 'customer' },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    {
      name: 'name',
      type: 'text',
      label: '氏名',
    },
    {
      name: 'phone',
      type: 'text',
      label: '電話番号',
    },
    {
      name: 'nameKana',
      type: 'text',
      label: 'フリガナ',
      admin: {
        description: 'カタカナ表記',
      },
    },
    {
      name: 'mobilePhone',
      type: 'text',
      label: '携帯電話番号',
    },
    // グループ2「個人情報」（collapsible, initCollapsed: true）
    {
      type: 'collapsible',
      label: '個人情報',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'gender',
          type: 'select',
          label: '性別',
          defaultValue: 'unspecified',
          options: [
            { label: '男性', value: 'male' },
            { label: '女性', value: 'female' },
            { label: '未設定', value: 'unspecified' },
          ],
        },
        {
          name: 'birthday',
          type: 'date',
          label: '生年月日',
          admin: {
            date: {
              displayFormat: 'yyyy/MM/dd',
              pickerAppearance: 'dayOnly',
            },
          },
        },
        {
          name: 'newsletterSubscribed',
          type: 'checkbox',
          label: 'メルマガ購読',
          defaultValue: false,
        },
      ],
    },
    // グループ3「住所情報」（collapsible, initCollapsed: false）
    {
      type: 'collapsible',
      label: '住所情報',
      admin: {
        initCollapsed: false,
      },
      fields: [
        {
          name: 'postalCode',
          type: 'text',
          label: '郵便番号',
          admin: {
            description: '例: 880-0861',
          },
        },
        {
          name: 'prefecture',
          type: 'select',
          label: '都道府県',
          options: [
            { label: '北海道', value: '北海道' },
            { label: '青森県', value: '青森県' },
            { label: '岩手県', value: '岩手県' },
            { label: '宮城県', value: '宮城県' },
            { label: '秋田県', value: '秋田県' },
            { label: '山形県', value: '山形県' },
            { label: '福島県', value: '福島県' },
            { label: '茨城県', value: '茨城県' },
            { label: '栃木県', value: '栃木県' },
            { label: '群馬県', value: '群馬県' },
            { label: '埼玉県', value: '埼玉県' },
            { label: '千葉県', value: '千葉県' },
            { label: '東京都', value: '東京都' },
            { label: '神奈川県', value: '神奈川県' },
            { label: '新潟県', value: '新潟県' },
            { label: '富山県', value: '富山県' },
            { label: '石川県', value: '石川県' },
            { label: '福井県', value: '福井県' },
            { label: '山梨県', value: '山梨県' },
            { label: '長野県', value: '長野県' },
            { label: '岐阜県', value: '岐阜県' },
            { label: '静岡県', value: '静岡県' },
            { label: '愛知県', value: '愛知県' },
            { label: '三重県', value: '三重県' },
            { label: '滋賀県', value: '滋賀県' },
            { label: '京都府', value: '京都府' },
            { label: '大阪府', value: '大阪府' },
            { label: '兵庫県', value: '兵庫県' },
            { label: '奈良県', value: '奈良県' },
            { label: '和歌山県', value: '和歌山県' },
            { label: '鳥取県', value: '鳥取県' },
            { label: '島根県', value: '島根県' },
            { label: '岡山県', value: '岡山県' },
            { label: '広島県', value: '広島県' },
            { label: '山口県', value: '山口県' },
            { label: '徳島県', value: '徳島県' },
            { label: '香川県', value: '香川県' },
            { label: '愛媛県', value: '愛媛県' },
            { label: '高知県', value: '高知県' },
            { label: '福岡県', value: '福岡県' },
            { label: '佐賀県', value: '佐賀県' },
            { label: '長崎県', value: '長崎県' },
            { label: '熊本県', value: '熊本県' },
            { label: '大分県', value: '大分県' },
            { label: '宮崎県', value: '宮崎県' },
            { label: '鹿児島県', value: '鹿児島県' },
            { label: '沖縄県', value: '沖縄県' },
          ],
        },
        {
          name: 'addressLine1',
          type: 'text',
          label: '住所(市区町村・番地)',
          admin: {
            description: '例: 宮崎市出来島町 181番地1',
          },
        },
        {
          name: 'addressLine2',
          type: 'text',
          label: '住所(建物名・部屋番号)',
        },
        {
          name: 'defaultAddress',
          type: 'text',
          label: 'デフォルト配送先住所',
        },
      ],
    },
    // グループ4（常時表示）
    {
      name: 'points',
      type: 'number',
      label: '保有ポイント残高',
      defaultValue: 0,
      admin: {
        description: '管理画面から編集可能',
      },
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
    // グループ5（sidebar）
    {
      name: 'legacyId',
      type: 'text',
      label: 'MakeShop移行用ID',
      unique: true,
      index: true,
      admin: {
        description: 'MakeShopからの移行用ID',
      },
    },
    {
      name: 'legacyRegisteredAt',
      type: 'date',
      label: 'MakeShop登録日',
      admin: {
        position: 'sidebar',
        description: 'MakeShopでの元の登録日',
        condition: (data) => data?.legacyRegisteredAt != null,
      },
    },
    {
      name: 'legacyData',
      type: 'json',
      label: '旧システム移行データ',
      admin: {
        position: 'sidebar',
        description: '旧システムからの移行時に保持する追加データ',
        condition: (data) => {
          return data?.legacyData != null && data.legacyData !== '' && data.legacyData !== 'null'
        },
        readOnly: true,
      },
    },
    {
      name: 'totalOrders',
      type: 'number',
      label: '累計注文数',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'この顧客の注文件数',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            if (!data?.id || !req.payload) return 0
            try {
              const result = await req.payload.find({
                collection: 'orders',
                where: { customer: { equals: data.id } },
                limit: 0,
                depth: 0,
              })
              return result.totalDocs
            } catch {
              return 0
            }
          },
        ],
      },
    },
    {
      name: 'totalSpent',
      type: 'number',
      label: '累計購入金額',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'この顧客の注文合計金額（円）',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            if (!data?.id || !req.payload) return 0
            try {
              const result = await req.payload.find({
                collection: 'orders',
                where: {
                  and: [
                    { customer: { equals: data.id } },
                    { status: { not_equals: 'cancelled' } },
                  ],
                },
                limit: 500,
                depth: 0,
              })
              return result.docs.reduce(
                (sum, order) => sum + ((order.totalAmount as number) || 0),
                0,
              )
            } catch {
              return 0
            }
          },
        ],
      },
    },
  ],
}
