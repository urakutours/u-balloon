import type { CollectionConfig, CollectionAfterReadHook } from 'payload'
import { isAdmin, isAdminOrOwner } from '../access'
import { afterOrderChange, beforeOrderStatusChange } from '../hooks/orderHooks'

/** 47都道府県 select options（Users.ts と共通） */
const PREFECTURE_OPTIONS = [
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
]

/**
 * afterRead hook: 新フィールド（sender/recipient/usageInfo）から旧フィールドへ後方互換ミラーを行う。
 * 旧フィールドが未設定で新フィールドが存在する場合のみ上書きする（既存データを壊さない）。
 * Payload v3 の group フィールドは API レスポンスではネストされたオブジェクトとして返される。
 */
const mirrorLegacyFields: CollectionAfterReadHook = ({ doc }) => {
  const sender = doc.sender as Record<string, unknown> | undefined
  const recipient = doc.recipient as Record<string, unknown> | undefined
  const usageInfo = doc.usageInfo as Record<string, unknown> | undefined

  // senderName: customer の name でミラー（doc.customer が既にオブジェクト展開済みの場合に対応）
  if (!sender?.senderName && doc.customer) {
    const customerName = typeof doc.customer === 'object'
      ? (doc.customer as Record<string, unknown>).name
      : undefined
    if (customerName && sender) {
      sender.senderName = customerName
    }
  }

  // deliveryAddress: 都道府県+市区町村・番地+建物名 を結合してセット
  if (!doc.deliveryAddress && recipient?.recipientAddressLine1) {
    const parts = [
      recipient.recipientPrefecture,
      recipient.recipientAddressLine1,
      recipient.recipientAddressLine2,
    ].filter(Boolean)
    if (parts.length > 0) {
      doc.deliveryAddress = parts.join('')
    }
  }

  // desiredArrivalDate: recipientDesiredArrivalDate からミラー
  if (!doc.desiredArrivalDate && recipient?.recipientDesiredArrivalDate) {
    doc.desiredArrivalDate = recipient.recipientDesiredArrivalDate
  }

  // desiredTimeSlot: recipientDesiredTimeSlotValue からミラー
  if (!doc.desiredTimeSlot && recipient?.recipientDesiredTimeSlotValue) {
    doc.desiredTimeSlot = recipient.recipientDesiredTimeSlotValue
  }

  // eventName: usageEventName からミラー
  if (!doc.eventName && usageInfo?.usageEventName) {
    doc.eventName = usageInfo.usageEventName
  }

  return doc
}

export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: {
    singular: '注文',
    plural: '注文',
  },
  admin: {
    useAsTitle: 'orderNumber',
    group: '商品・注文',
    description: '受注一覧。ステータス変更・発送通知・追跡番号の管理ができます。',
    defaultColumns: ['orderNumber', 'customer', 'totalAmount', 'status', 'desiredArrivalDate', 'createdAt'],
    listSearchableFields: ['orderNumber', 'deliveryAddress', 'notes'],
  },
  hooks: {
    beforeChange: [beforeOrderStatusChange],
    afterChange: [afterOrderChange],
    afterRead: [mirrorLegacyFields],
  },
  access: {
    read: isAdminOrOwner('customer'),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    // Top-level fields
    {
      name: 'orderNumber',
      type: 'text',
      label: '注文番号',
      unique: true,
      required: true,
      admin: {
        description: '自動採番',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (!value) {
              const timestamp = Date.now().toString(36).toUpperCase()
              const random = Math.random().toString(36).substring(2, 6).toUpperCase()
              return `ORD-${timestamp}-${random}`
            }
            return value
          },
        ],
      },
    },
    {
      name: 'status',
      type: 'select',
      label: 'ステータス',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: '保留中', value: 'pending' },
        { label: '入金待ち', value: 'awaiting_payment' },
        { label: '確認済み', value: 'confirmed' },
        { label: '準備中', value: 'preparing' },
        { label: '発送済み', value: 'shipped' },
        { label: '配達完了', value: 'delivered' },
        { label: 'キャンセル', value: 'cancelled' },
      ],
    },
    // Tabs
    {
      type: 'tabs',
      tabs: [
        {
          label: '注文内容',
          fields: [
            {
              name: 'isGuestOrder',
              type: 'checkbox',
              label: 'ゲスト注文',
              defaultValue: false,
              admin: {
                readOnly: true,
                description: '非会員（ゲスト）による注文',
              },
            },
            {
              name: 'customer',
              type: 'relationship',
              relationTo: 'users',
              label: '顧客',
              required: false,
            },
            {
              name: 'items',
              type: 'array',
              label: '注文商品',
              required: true,
              fields: [
                {
                  name: 'product',
                  type: 'relationship',
                  relationTo: 'products',
                  label: '商品',
                  required: true,
                },
                {
                  name: 'quantity',
                  type: 'number',
                  label: '数量',
                  required: true,
                  min: 1,
                  defaultValue: 1,
                },
                {
                  name: 'selectedOptions',
                  type: 'json',
                  label: '選択されたカスタムオプション',
                },
                {
                  name: 'unitPrice',
                  type: 'number',
                  label: '単価',
                  required: true,
                  min: 0,
                },
              ],
            },
            {
              name: 'subtotal',
              type: 'number',
              label: '商品小計',
              required: true,
              min: 0,
            },
            {
              name: 'promotion',
              type: 'relationship',
              relationTo: 'promotions',
              label: '適用プロモーション',
            },
            {
              name: 'discountAmount',
              type: 'number',
              label: '割引額',
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'pointsUsed',
              type: 'number',
              label: '使用ポイント',
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'pointsEarned',
              type: 'number',
              label: '付与ポイント',
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'totalAmount',
              type: 'number',
              label: '合計金額',
              required: true,
              min: 0,
              admin: {
                description: '送料込み、ポイント適用後',
              },
            },
          ],
        },
        {
          label: '配送・日程',
          fields: [
            {
              name: 'deliveryAddress',
              type: 'text',
              label: '配送先住所',
              admin: {
                description: '後方互換用フィールド。新規注文は sender/recipient/usageInfo 側を参照',
              },
            },
            {
              name: 'deliveryDistance',
              type: 'number',
              label: '配送距離(km)',
              min: 0,
            },
            {
              name: 'shippingFee',
              type: 'number',
              label: '送料',
              defaultValue: 0,
              min: 0,
            },
            {
              name: 'desiredArrivalDate',
              type: 'date',
              label: '到着希望日',
              admin: {
                description: '後方互換用フィールド。新規注文は sender/recipient/usageInfo 側を参照',
                date: {
                  pickerAppearance: 'dayOnly',
                  displayFormat: 'yyyy/MM/dd',
                },
              },
            },
            {
              name: 'desiredTimeSlot',
              type: 'select',
              label: '希望時間帯',
              admin: {
                description: '後方互換用フィールド。新規注文は sender/recipient/usageInfo 側を参照',
              },
              options: [
                { label: '午前', value: 'morning' },
                { label: '午後', value: 'afternoon' },
                { label: '夕方', value: 'evening' },
                { label: '夜', value: 'night' },
              ],
            },
            {
              name: 'eventName',
              type: 'text',
              label: 'イベント名',
              admin: {
                description: '後方互換用フィールド。新規注文は sender/recipient/usageInfo 側を参照',
              },
            },
            {
              name: 'eventDateTime',
              type: 'date',
              label: '使用日時（イベント日時）',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                  displayFormat: 'yyyy/MM/dd HH:mm',
                },
                description: '後方互換用フィールド。新規注文は sender/recipient/usageInfo 側を参照',
              },
            },
            // ── 新フィールド群（チェックアウト再設計）────────────────────────────
            {
              name: 'sender',
              type: 'group',
              label: '送り主情報',
              fields: [
                {
                  name: 'senderName',
                  type: 'text',
                  label: '氏名',
                },
                {
                  name: 'senderNameKana',
                  type: 'text',
                  label: 'フリガナ',
                },
                {
                  name: 'senderEmail',
                  type: 'email',
                  label: 'メールアドレス',
                },
                {
                  name: 'senderPhone',
                  type: 'text',
                  label: '電話番号',
                },
                {
                  name: 'senderPostalCode',
                  type: 'text',
                  label: '郵便番号',
                },
                {
                  name: 'senderPrefecture',
                  type: 'select',
                  label: '都道府県',
                  options: PREFECTURE_OPTIONS,
                },
                {
                  name: 'senderAddressLine1',
                  type: 'text',
                  label: '市区町村・番地',
                },
                {
                  name: 'senderAddressLine2',
                  type: 'text',
                  label: '建物名・部屋番号',
                },
              ],
            },
            {
              name: 'recipient',
              type: 'group',
              label: '送り先情報',
              fields: [
                {
                  name: 'recipientSameAsSender',
                  type: 'checkbox',
                  label: '送り主と同じ',
                  defaultValue: true,
                },
                {
                  name: 'recipientName',
                  type: 'text',
                  label: '氏名',
                },
                {
                  name: 'recipientNameKana',
                  type: 'text',
                  label: 'フリガナ',
                },
                {
                  name: 'recipientPhone',
                  type: 'text',
                  label: '電話番号',
                },
                {
                  name: 'recipientPostalCode',
                  type: 'text',
                  label: '郵便番号',
                },
                {
                  name: 'recipientPrefecture',
                  type: 'select',
                  label: '都道府県',
                  options: PREFECTURE_OPTIONS,
                },
                {
                  name: 'recipientAddressLine1',
                  type: 'text',
                  label: '市区町村・番地',
                },
                {
                  name: 'recipientAddressLine2',
                  type: 'text',
                  label: '建物名・部屋番号',
                },
                {
                  name: 'recipientDesiredArrivalDate',
                  type: 'date',
                  label: '到着希望日',
                  admin: {
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'yyyy/MM/dd',
                    },
                  },
                },
                {
                  name: 'recipientDesiredTimeSlotValue',
                  type: 'text',
                  label: '希望時間帯(値)',
                },
                {
                  name: 'recipientDesiredTimeSlotLabel',
                  type: 'text',
                  label: '希望時間帯(表示名)',
                },
              ],
            },
            {
              name: 'giftSettings',
              type: 'group',
              label: 'ギフト設定',
              fields: [
                {
                  name: 'giftWrappingOptionId',
                  type: 'text',
                  label: 'ラッピングオプションID',
                },
                {
                  name: 'giftWrappingOptionName',
                  type: 'text',
                  label: 'ラッピングオプション名',
                },
                {
                  name: 'giftWrappingFee',
                  type: 'number',
                  label: 'ラッピング料金',
                  min: 0,
                  defaultValue: 0,
                },
                {
                  name: 'giftMessageCardTemplateId',
                  type: 'text',
                  label: 'メッセージカードテンプレートID',
                },
                {
                  name: 'giftMessageCardText',
                  type: 'textarea',
                  label: 'メッセージカード文面',
                  maxLength: 500,
                },
              ],
            },
            {
              name: 'usageInfo',
              type: 'group',
              label: '使用日時',
              fields: [
                {
                  name: 'usageEventName',
                  type: 'text',
                  label: 'イベント名',
                },
                {
                  name: 'usageDate',
                  type: 'date',
                  label: '使用日',
                  admin: {
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'yyyy/MM/dd',
                    },
                  },
                },
                {
                  name: 'usageTimeText',
                  type: 'text',
                  label: '使用時間（任意）',
                  admin: {
                    placeholder: '例: 14:00 ごろ / 午後',
                  },
                },
              ],
            },
            {
              name: 'shippingPlanId',
              type: 'text',
              label: '配送プランID',
              admin: {
                description: '注文時点の shippingPlans 要素 ID をスナップショット保存します。',
                readOnly: false,
              },
            },
            {
              name: 'shippingPlanName',
              type: 'text',
              label: '配送プラン名',
              admin: {
                description: '注文時点のプラン名を表示用にスナップショット保存します。',
              },
            },
            {
              name: 'scheduledShipDate',
              type: 'date',
              label: '発送予定日',
              admin: {
                description: '発送予定日。銀行振込注文の場合、この日の N 日前が振込期限になります（N は SiteSettings の bankTransferDeadlineDays）。',
                date: {
                  pickerAppearance: 'dayOnly',
                  displayFormat: 'yyyy/MM/dd',
                },
              },
            },
            {
              name: 'trackingInfo',
              type: 'group',
              label: '配送追跡情報',
              admin: {
                description: '発送済みステータスに変更する前に、配送業者と追跡番号を入力してください。',
              },
              fields: [
                {
                  name: 'carrier',
                  type: 'select',
                  label: '配送業者',
                  options: [
                    { label: 'ヤマト運輸', value: 'yamato' },
                    { label: 'ゆうパック', value: 'yupack' },
                    { label: '佐川急便', value: 'sagawa' },
                    { label: 'その他', value: 'other' },
                  ],
                },
                {
                  name: 'trackingNumber',
                  type: 'text',
                  label: '追跡番号',
                },
              ],
            },
          ],
        },
        {
          label: '決済',
          fields: [
            {
              name: 'paymentMethod',
              type: 'select',
              label: '支払い方法',
              defaultValue: 'stripe',
              required: true,
              options: [
                { label: 'クレジットカード（Stripe）', value: 'stripe' },
                { label: '銀行振込', value: 'bank_transfer' },
              ],
            },
            {
              name: 'bankTransferDeadline',
              type: 'date',
              label: '振込期限',
              admin: {
                date: { pickerAppearance: 'dayOnly' },
                condition: (data) => data?.paymentMethod === 'bank_transfer',
                description: '銀行振込の期限。scheduledShipDate が設定されている場合は「発送予定日の N 日前」、未設定時は「注文日 + N 日」の暫定値。',
              },
            },
            {
              name: 'bankTransferConfirmedAt',
              type: 'date',
              label: '入金確認日',
              admin: {
                date: { pickerAppearance: 'dayOnly' },
                condition: (data) => data?.paymentMethod === 'bank_transfer',
              },
            },
          ],
        },
        {
          label: 'メモ',
          fields: [
            {
              name: 'notes',
              type: 'textarea',
              label: '備考',
              maxLength: 1000,
            },
          ],
        },
      ],
    },
    // Sidebar fields
    {
      name: 'stripeSessionId',
      type: 'text',
      label: 'Stripe Checkout Session ID',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.paymentMethod === 'stripe',
      },
    },
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      label: 'Stripe Payment Intent ID',
      admin: {
        position: 'sidebar',
        condition: (data) => data?.paymentMethod === 'stripe',
      },
    },
  ],
}
