import { getPayload } from 'payload'
import config from '@payload-config'

export interface StaticPageData {
  id: string
  title: string
  slug: string
  pageType?: string
  layout?: any[]
  meta?: {
    title?: string
    description?: string
    ogImage?: any
  }
}

/**
 * Fetch a CMS-managed static page by pageType (about, legal, privacy, delivery, contact).
 * Returns null if no published page exists for this type.
 */
export async function getStaticPage(pageType: string): Promise<StaticPageData | null> {
  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'pages',
      where: {
        pageType: { equals: pageType },
        status: { equals: 'published' },
      },
      limit: 1,
      depth: 2,
    })

    if (result.docs.length === 0) return null
    return result.docs[0] as unknown as StaticPageData
  } catch {
    return null
  }
}
