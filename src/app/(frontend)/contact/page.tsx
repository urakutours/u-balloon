import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { ContactForm } from './ContactForm'
import { getStaticPage } from '@/lib/get-static-page'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage('contact')
  return {
    title: page?.meta?.title || page?.title || 'お問い合わせ',
    description: page?.meta?.description || 'uballoonへのお問い合わせはこちらから。商品、配送、カスタムオーダー、バルーン装飾についてお気軽にご連絡ください。',
  }
}

export default async function ContactPage() {
  const cmsPage = await getStaticPage('contact')
  const pageTitle = cmsPage?.title || 'お問い合わせ'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Breadcrumb */}
      <nav aria-label="パンくずリスト" className="mb-8">
        <ol className="flex items-center gap-1 text-sm text-foreground/50">
          <li>
            <Link href="/" className="transition-colors hover:text-foreground/80">
              ホーム
            </Link>
          </li>
          <li>
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="font-medium text-foreground/80">{pageTitle}</li>
        </ol>
      </nav>

      {/* Page Title */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-brand-teal sm:text-3xl">
          {pageTitle}
        </h1>
        {!cmsPage?.layout?.length && (
          <p className="mt-2 text-sm text-foreground/50">
            ご質問・ご要望がございましたら、お気軽にお問い合わせください。
          </p>
        )}
      </div>

      {/* CMS content above form (if any) */}
      {cmsPage?.layout?.length ? (
        <div className="mb-8">
          <BlockRenderer blocks={cmsPage.layout} />
        </div>
      ) : null}

      {/* Contact Form (always displayed) */}
      <ContactForm />
    </div>
  )
}
