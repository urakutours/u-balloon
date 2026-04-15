import type { CollectionConfig } from 'payload'
import { isAdmin } from '../access'

export const EmailTemplates: CollectionConfig = {
  slug: 'email-templates',
  labels: {
    singular: 'メールテンプレート',
    plural: 'メールテンプレート',
  },
  admin: {
    useAsTitle: 'name',
    group: '設定',
    description: '注文確認・発送通知などの自動メール文面を編集できます。{{変数名}} で動的な値を埋め込めます。',
    defaultColumns: ['name', 'slug', 'subject', 'updatedAt'],
    listSearchableFields: ['name', 'slug', 'subject'],
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'テンプレート名',
      required: true,
      admin: { description: '管理用名称（例: 「注文確認メール」）' },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'テンプレートID',
      unique: true,
      required: true,
      index: true,
      admin: {
        description: 'システム識別子。変更しないでください。',
      },
    },
    {
      name: 'subject',
      type: 'text',
      label: '件名',
      required: true,
      admin: { description: '変数利用可（例: 「【uballoon】ご注文確認 {{orderNumber}}」）' },
    },
    {
      name: 'body',
      type: 'textarea',
      label: '本文',
      required: true,
      admin: {
        description: '利用可能な変数:\n注文系: {{name}}, {{orderNumber}}, {{totalAmount}}, {{status}}\nポイント: {{pointsEarned}}, {{pointsBalance}}\n配送: {{trackingNumber}}, {{carrier}}, {{trackingUrl}}\n共通: {{appUrl}}',
      },
    },
    {
      name: 'availableVariables',
      type: 'json',
      label: '利用可能な変数一覧',
      admin: {
        readOnly: true,
        description: '参考用: このテンプレートで使える変数の一覧',
      },
    },
    {
      name: 'bodyBlocks',
      type: 'array',
      label: '本文ブロック（ハイブリッド方式）',
      admin: {
        description:
          'レイアウトは React 側、可変テキストだけ DB から差し替えるブロック群。blockKey が空なら既存 body フォールバック',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'blockKey',
          type: 'text',
          label: 'ブロックキー',
          required: true,
          admin: {
            description: '例: greeting / intro / bank_transfer_lead / footer_note',
          },
        },
        {
          name: 'content',
          type: 'textarea',
          label: '内容',
          required: true,
          admin: {
            description: '変数は {{name}} / {{orderNumber}} のように使える',
          },
        },
      ],
    },
  ],
}
