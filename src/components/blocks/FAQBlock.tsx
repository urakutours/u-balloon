'use client'

import { useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { ChevronDown } from 'lucide-react'

type FAQItem = {
  question: string
  answer: Record<string, unknown>
}

type Props = {
  heading?: string
  items: FAQItem[]
}

export function FAQBlockRenderer({ heading, items }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      {heading && <h2 className="mb-8 text-center text-2xl font-bold">{heading}</h2>}
      <div className="space-y-3">
        {items?.map((item, i) => (
          <div key={i} className="rounded-lg border">
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="flex w-full items-center justify-between px-6 py-4 text-left font-medium"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 transition-transform ${openIndex === i ? 'rotate-180' : ''}`}
              />
            </button>
            {openIndex === i && (
              <div className="prose max-w-none border-t px-6 py-4">
                {/* @ts-expect-error Payload rich text data type */}
                <RichText data={item.answer} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
