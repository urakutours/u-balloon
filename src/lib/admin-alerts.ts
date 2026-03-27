import { sendEmail } from './email'
import React from 'react'
import { AdminAlertEmail } from './email-templates'

const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_REPLY_TO || 'info@uballoon.com'

type AlertType = 'low_stock' | 'new_order' | 'order_cancelled' | 'bank_transfer_overdue'

type AlertPayload = {
  type: AlertType
  title: string
  details: string
  urgency?: 'normal' | 'high'
}

const alertLabels: Record<AlertType, string> = {
  low_stock: '在庫アラート',
  new_order: '新規注文',
  order_cancelled: 'キャンセル',
  bank_transfer_overdue: '振込期限超過',
}

export async function sendAdminAlert({ type, title, details, urgency = 'normal' }: AlertPayload) {
  const prefix = urgency === 'high' ? '【緊急】' : ''
  const label = alertLabels[type] || type

  try {
    await sendEmail({
      to: ADMIN_ALERT_EMAIL,
      subject: `${prefix}【uballoon ${label}】${title}`,
      react: React.createElement(AdminAlertEmail, {
        alertType: label,
        title,
        details,
        urgency,
      }),
    })
    console.log(`[Alert] ${type}: ${title}`)
  } catch (err) {
    console.error('[Alert] Failed to send admin alert:', err)
  }
}
