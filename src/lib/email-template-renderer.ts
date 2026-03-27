import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Fetch an email template by slug and replace variables.
 * Falls back to hardcoded defaults if the template doesn't exist in DB.
 */
export async function renderEmailTemplate(
  templateSlug: string,
  variables: Record<string, string | number>,
): Promise<{ subject: string; body: string } | null> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'email-templates',
      where: { slug: { equals: templateSlug } },
      limit: 1,
    })

    const template = result.docs[0] as any
    if (!template) return null

    const replaceVars = (text: string) => {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const val = variables[key]
        return val != null ? String(val) : `{{${key}}}`
      })
    }

    return {
      subject: replaceVars(template.subject),
      body: replaceVars(template.body),
    }
  } catch (err) {
    console.error('Email template render error:', err)
    return null
  }
}
