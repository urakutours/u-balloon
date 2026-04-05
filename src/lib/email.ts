import { Resend } from 'resend'
import React from 'react'
import { getSiteSettings } from './site-settings'

// Module-level Resend client cache — re-created if the API key changes.
let resendClient: Resend | null = null
let resendApiKeyCache: string | null = null

async function getResend(): Promise<Resend | null> {
  const settings = await getSiteSettings()
  const apiKey = settings.resendApiKey || process.env.RESEND_API_KEY || null
  if (!apiKey) return null
  if (apiKey !== resendApiKeyCache) {
    resendClient = new Resend(apiKey)
    resendApiKeyCache = apiKey
  }
  return resendClient
}

type SendEmailParams = {
  to: string
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  const settings = await getSiteSettings()
  const resend = await getResend()

  if (!resend) {
    // Fallback: console log when Resend is not configured
    console.log('=== EMAIL (Resend未設定 - コンソール出力) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Component: ${react.type?.toString?.() || 'ReactElement'}`)
    console.log('============================================')
    return { success: true, fallback: true }
  }

  const fromEmail =
    settings.emailFromAddress ||
    process.env.EMAIL_FROM_ADDRESS ||
    'noreply@uballoon.com'
  const fromName =
    settings.emailFromName || process.env.EMAIL_FROM_NAME || 'uballoon'
  const replyTo =
    settings.emailReplyTo || process.env.EMAIL_REPLY_TO || 'info@uballoon.com'

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      replyTo,
      to,
      subject,
      react,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Email send error:', err)
    return { success: false, error: err }
  }
}
