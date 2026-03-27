import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
}

async function getPost(slug: string) {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'posts',
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
  const post = await getPost(slug)
  if (!post) return {}

  const meta = post.meta as { title?: string; description?: string } | undefined

  return {
    title: meta?.title || post.title,
    description: meta?.description || (post as any).excerpt || undefined,
    openGraph: (post as any).featuredImage?.url
      ? { images: [{ url: (post as any).featuredImage.url }] }
      : undefined,
  }
}

const categoryLabels: Record<string, string> = {
  news: 'お知らせ',
  column: 'コラム',
  event: 'イベント',
  guide: 'バルーンの選び方',
  staff: 'スタッフブログ',
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getPost(slug) as any

  if (!post) notFound()

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-pink-600">ホーム</Link>
        <span className="mx-2">/</span>
        <Link href="/blog" className="hover:text-pink-600">ブログ</Link>
        <span className="mx-2">/</span>
        <span>{post.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          {post.category && (
            <Link
              href={`/blog?category=${post.category}`}
              className="rounded bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700"
            >
              {categoryLabels[post.category] || post.category}
            </Link>
          )}
          {post.publishedAt && (
            <time className="text-sm text-gray-500">
              {format(new Date(post.publishedAt), 'yyyy年M月d日', { locale: ja })}
            </time>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
      </header>

      {/* Featured image */}
      {post.featuredImage?.url && (
        <img
          src={post.featuredImage.url}
          alt={post.featuredImage.alt || post.title}
          className="mb-8 h-auto w-full rounded-lg object-cover"
        />
      )}

      {/* Content */}
      <div className="prose prose-lg max-w-none">
        <RichText data={post.content} />
      </div>

      {/* Back link */}
      <div className="mt-12 border-t pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center text-pink-600 hover:text-pink-700"
        >
          ← ブログ一覧に戻る
        </Link>
      </div>
    </article>
  )
}
