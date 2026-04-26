/**
 * Payload v3 EmailAdapter that delegates to the existing Resend wrapper.
 *
 * Used by Payload for built-in flows (forgot password, verify email).
 * SiteSettings (decrypted via getSiteSettings) takes priority over env vars,
 * matching the behavior of `lib/email.ts`.
 */

import type { EmailAdapter, SendEmailOptions } from 'payload'
import { Resend } from 'resend'
import { getSiteSettings } from './site-settings'

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

function pickFromAddress(message: SendEmailOptions, fallback: string): string {
  const raw = message.from
  if (typeof raw === 'string' && raw.length > 0) return raw
  if (raw && typeof raw === 'object' && 'address' in raw && raw.address) {
    const name = (raw as { name?: string }).name
    return name ? `${name} <${raw.address}>` : raw.address
  }
  return fallback
}

function normalizeRecipients(value: SendEmailOptions['to']): string[] {
  if (!value) return []
  const arr = Array.isArray(value) ? value : [value]
  return arr
    .map((v) => {
      if (typeof v === 'string') return v
      if (v && typeof v === 'object' && 'address' in v && v.address) return v.address
      return ''
    })
    .filter((v): v is string => Boolean(v))
}

export const payloadEmailAdapter: EmailAdapter<{ success: boolean; id?: string; error?: unknown }> = ({
  payload,
}) => {
  const defaultFromAddress =
    process.env.EMAIL_FROM_ADDRESS || 'noreply@uballoon.com'
  const defaultFromName = process.env.EMAIL_FROM_NAME || 'uballoon'

  return {
    name: 'resend-via-uballoon',
    defaultFromAddress,
    defaultFromName,
    sendEmail: async (message) => {
      const settings = await getSiteSettings()
      const fromAddress =
        settings.emailFromAddress || process.env.EMAIL_FROM_ADDRESS || defaultFromAddress
      const fromName = settings.emailFromName || process.env.EMAIL_FROM_NAME || defaultFromName
      const replyTo =
        settings.emailReplyTo || process.env.EMAIL_REPLY_TO || 'info@uballoon.com'

      const to = normalizeRecipients(message.to)
      if (to.length === 0) {
        payload.logger.warn('payload-email-adapter: empty recipient list, skipping send')
        return { success: false, error: 'no-recipient' }
      }

      const subject = typeof message.subject === 'string' ? message.subject : ''
      const html =
        typeof message.html === 'string'
          ? message.html
          : message.html instanceof Buffer
            ? message.html.toString('utf8')
            : ''

      const from = pickFromAddress(message, `${fromName} <${fromAddress}>`)
      const resend = await getResend()

      if (!resend) {
        payload.logger.warn(
          `payload-email-adapter: Resend not configured. Logging email instead. to=${to.join(',')} subject=${subject}`,
        )
        return { success: true, id: undefined }
      }

      try {
        const { data, error } = await resend.emails.send({
          from,
          replyTo,
          to,
          subject,
          html,
        })
        if (error) {
          payload.logger.error({ err: error }, 'payload-email-adapter: Resend returned error')
          return { success: false, error }
        }
        return { success: true, id: data?.id }
      } catch (err) {
        payload.logger.error({ err }, 'payload-email-adapter: send failed')
        return { success: false, error: err }
      }
    },
  }
}
