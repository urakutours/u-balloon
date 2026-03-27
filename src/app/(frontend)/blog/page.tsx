import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ブログ',
  description: 'uballoonのブログ。バルーンギフトに関するお知らせ、コラム、イベント情報をお届けします。',
}

const categoryLabels: Record<string, string> = {
  news: 'お知らせ',
  column: 'コラム',
  event: 'イベント',
  guide: 'バルーンの選び方',
  staff: 'スタッフブログ',
}

type SearchParams = Promise<{ category?: string; page?: string }>

export default async function BlogListPage({ searchParams }: { searchParams: SearchParams }) {
  const { category, page: pageParam } = await searchParams
  const page = parseInt(pageParam || '1', 10)
  const limit = 12

  const payload = await getPayload({ config })
  const where: any = { status: { equals: 'published' } }
  if (category) where.category = { equals: category }

  const result = await payload.find({
    collection: 'posts',
    where,
    sort: '-publishedAt',
    limit,
    page,
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="mb-8 text-3xl font-bold">ブログ</h1>

      {/* Category filter */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/blog"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!category ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          すべて
        </Link>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <Link
            key={key}
            href={`/blog?category=${key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${category === key ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Posts grid */}
      {result.docs.length === 0 ? (
        <p className="text-gray-500">記事がありません。</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {result.docs.map((post: any) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <article className="overflow-hidden rounded-lg border transition hover:shadow-md">
                {post.featuredImage?.url && (
                  <img
                    src={post.featuredImage.url}
                    alt={post.featuredImage.alt || post.title}
                    className="h-48 w-full object-cover transition group-hover:scale-105"
                  />
                )}
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    {post.category && (
                      <span className="rounded bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
                        {categoryLabels[post.category] || post.category}
                      </span>
                    )}
                    {post.publishedAt && (
                      <time className="text-xs text-gray-500">
                        {format(new Date(post.publishedAt), 'yyyy年M月d日', { locale: ja })}
                      </time>
                    )}
                  </div>
                  <h2 className="font-bold leading-snug group-hover:text-pink-600">{post.title}</h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">{post.excerpt}</p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/blog?${category ? `category=${category}&` : ''}page=${p}`}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${p === page ? 'bg-pink-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
