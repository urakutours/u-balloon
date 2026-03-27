import type { CollectionConfig } from 'payload'
import { anyone, isAdmin } from '../access'

export const BusinessCalendar: CollectionConfig = {
  slug: 'business-calendar',
  labels: {
    singular: '営業カレンダー',
    plural: '営業カレンダー',
  },
  admin: {
    useAsTitle: 'date',
    group: '設定',
    description: '休業日・発送不可日をカレンダーで管理。曜日パターンでの一括登録にも対応しています。',
    defaultColumns: ['date', 'isHoliday', 'shippingAvailable', 'note'],
    components: {
      beforeListTable: ['@/components/admin/BusinessCalendarView'],
    },
  },
  access: {
    read: anyone,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'date',
      type: 'date',
      label: '対象日',
      required: true,
      unique: true,
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy/MM/dd',
        },
      },
    },
    {
      name: 'isHoliday',
      type: 'checkbox',
      label: '休業日',
      defaultValue: false,
    },
    {
      name: 'holidayReason',
      type: 'text',
      label: '休業理由',
      admin: {
        condition: (data, siblingData) => siblingData?.isHoliday,
      },
    },
    {
      name: 'shippingAvailable',
      type: 'checkbox',
      label: '発送可',
      defaultValue: true,
    },
    {
      name: 'note',
      type: 'text',
      label: '管理メモ',
    },
  ],
}
