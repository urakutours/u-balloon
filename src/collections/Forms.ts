import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const Forms: CollectionConfig = {
  slug: 'forms',
  labels: {
    singular: 'フォーム',
    plural: 'フォーム',
  },
  admin: {
    useAsTitle: 'title',
    group: 'サイト管理',
    description: 'お問い合わせ・アンケート等のフォーム作成。テキスト・メール・選択肢など自由にフィールドを追加でき、送信時の通知先も設定できます。',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
  },
  access: {
    read: anyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'フォーム名',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      label: 'スラッグ',
      unique: true,
      required: true,
      index: true,
      admin: {
        description: 'フォーム識別子（例: "contact", "inquiry"）',
      },
    },
    {
      name: 'fields',
      type: 'array',
      label: 'フォームフィールド',
      minRows: 1,
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'フィールド名（英語）',
          required: true,
          admin: { description: 'データ保存用のキー名（例: "email", "phone"）' },
        },
        {
          name: 'label',
          type: 'text',
          label: '表示ラベル',
          required: true,
        },
        {
          name: 'type',
          type: 'select',
          label: '入力タイプ',
          required: true,
          options: [
            { label: 'テキスト', value: 'text' },
            { label: 'メールアドレス', value: 'email' },
            { label: '電話番号', value: 'tel' },
            { label: 'テキストエリア', value: 'textarea' },
            { label: 'セレクト', value: 'select' },
            { label: 'チェックボックス', value: 'checkbox' },
          ],
        },
        {
          name: 'required',
          type: 'checkbox',
          label: '必須',
          defaultValue: false,
        },
        {
          name: 'placeholder',
          type: 'text',
          label: 'プレースホルダ',
        },
        {
          name: 'options',
          type: 'json',
          label: '選択肢（セレクト用）',
          admin: {
            description: '選択肢の配列（例: ["相談", "見積もり", "その他"]）',
            condition: (_, siblingData) => siblingData?.type === 'select',
          },
        },
        {
          name: 'width',
          type: 'select',
          label: '幅',
          defaultValue: 'full',
          options: [
            { label: '全幅', value: 'full' },
            { label: '半分', value: 'half' },
          ],
        },
      ],
    },
    {
      name: 'submitLabel',
      type: 'text',
      label: '送信ボタンテキスト',
      defaultValue: '送信する',
    },
    {
      name: 'confirmationMessage',
      type: 'textarea',
      label: '送信完了メッセージ',
      defaultValue: 'お問い合わせありがとうございます。内容を確認の上、ご連絡いたします。',
    },
    {
      name: 'notifyEmails',
      type: 'array',
      label: '通知先メールアドレス',
      admin: {
        description: '送信時に通知するメールアドレスを追加してください',
      },
      fields: [
        {
          name: 'email',
          type: 'email',
          label: 'メールアドレス',
          required: true,
        },
      ],
    },
  ],
}
