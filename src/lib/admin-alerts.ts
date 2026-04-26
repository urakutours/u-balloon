import { sendEmail } from './email'
import React from 'react'
import { AdminAlertEmail } from './email-templates'
import { getSiteSettings } from './site-settings'
import { getBrand } from './brand'

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
  const settings = await getSiteSettings()
  const adminEmail =
    settings.adminAlertEmail ||
    process.env.ADMIN_ALERT_EMAIL ||
    process.env.EMAIL_REPLY_TO ||
    'info@u-balloon.com'

  const prefix = urgency === 'high' ? '【緊急】' : ''
  const label = alertLabels[type] || type
  const brand = await getBrand()
  // Reuse the brand's subject prefix and inject the alert label inside the
  // brackets, e.g. `【u-balloon 在庫アラート】`. The replace pattern only fires
  // for prefixes ending with `】`; otherwise we append the label after the
  // prefix so admin alerts are still recognizable when the operator picks a
  // non-standard subject prefix format.
  const brandSubjectPrefix = brand.subjectPrefix.endsWith('】')
    ? brand.subjectPrefix.replace(/】$/, ` ${label}】`)
    : `${brand.subjectPrefix}[${label}] `

  try {
    await sendEmail({
      to: adminEmail,
      subject: `${prefix}${brandSubjectPrefix}${title}`,
      react: React.createElement(AdminAlertEmail, {
        alertType: label,
        title,
        details,
        urgency,
        brandName: brand.name,
        emailFooterTagline: brand.emailFooterTagline,
      }),
    })
    console.log(`[Alert] ${type}: ${title}`)
  } catch (err) {
    console.error('[Alert] Failed to send admin alert:', err)
  }
}
