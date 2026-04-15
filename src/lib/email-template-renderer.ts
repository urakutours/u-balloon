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

/**
 * Fetch email template by slug and return subject + blocks as a map.
 * Falls back to empty blocks if no bodyBlocks are defined.
 * Returns null if template doesn't exist.
 */
export async function renderEmailBlocks(
  templateSlug: string,
  variables: Record<string, string | number>,
): Promise<{ subject: string; blocks: Record<string, string> } | null> {
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

    const blocks: Record<string, string> = {}
    if (Array.isArray(template.bodyBlocks)) {
      for (const b of template.bodyBlocks) {
        if (b?.blockKey && typeof b.content === 'string') {
          blocks[b.blockKey] = replaceVars(b.content)
        }
      }
    }

    return {
      subject: replaceVars(template.subject || ''),
      blocks,
    }
  } catch (err) {
    console.error('Email blocks render error:', err)
    return null
  }
}
