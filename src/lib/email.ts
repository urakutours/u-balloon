import { Resend } from 'resend'
import React from 'react'

const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'noreply@uballoon.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'uballoon'
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'info@uballoon.com'

let resendClient: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

type SendEmailParams = {
  to: string
  subject: string
  react: React.ReactElement
}

export async function sendEmail({ to, subject, react }: SendEmailParams) {
  const resend = getResend()

  if (!resend) {
    // Fallback: console log when RESEND_API_KEY is not set
    console.log('=== EMAIL (Resend未設定 - コンソール出力) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Component: ${react.type?.toString?.() || 'ReactElement'}`)
    console.log('============================================')
    return { success: true, fallback: true }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      replyTo: REPLY_TO,
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
