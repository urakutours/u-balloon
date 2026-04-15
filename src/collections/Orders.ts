import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrOwner } from '../access'
import { afterOrderChange, beforeOrderStatusChange } from '../hooks/orderHooks'

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
              name: 'customer',
              type: 'relationship',
              relationTo: 'users',
              label: '顧客',
              required: true,
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
                description: '結婚式・誕生日パーティーなどのイベント名',
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
                description: 'バルーンを使うイベントの日時',
              },
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
