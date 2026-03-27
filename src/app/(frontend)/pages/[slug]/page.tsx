import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

async function getPage(slug: string) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
      status: { equals: 'published' },
    },
    limit: 1,
  })
  return result.docs[0] || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return {}

  const meta = page.meta as { title?: string; description?: string; ogImage?: { url: string } } | undefined

  return {
    title: meta?.title || page.title,
    description: meta?.description || undefined,
    openGraph: meta?.ogImage
      ? { images: [{ url: (meta.ogImage as { url: string }).url }] }
      : undefined,
  }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page) notFound()

  return (
    <article>
      <BlockRenderer blocks={(page.layout as any[]) || []} />
    </article>
  )
}
