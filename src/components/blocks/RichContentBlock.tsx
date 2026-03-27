import { RichText } from '@payloadcms/richtext-lexical/react'

type Props = {
  content: Record<string, unknown>
}

export function RichContentBlockRenderer({ content }: Props) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <div className="prose prose-lg max-w-none">
        {/* @ts-expect-error Payload rich text data type */}
        <RichText data={content} />
      </div>
    </section>
  )
}
