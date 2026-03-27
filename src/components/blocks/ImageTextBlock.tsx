import { RichText } from '@payloadcms/richtext-lexical/react'

type Props = {
  image: { url: string; alt: string }
  heading?: string
  text: Record<string, unknown>
  layout?: 'imageLeft' | 'imageRight'
}

export function ImageTextBlockRenderer({ image, heading, text, layout = 'imageLeft' }: Props) {
  const isReversed = layout === 'imageRight'

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className={`flex flex-col gap-8 md:flex-row md:items-center ${isReversed ? 'md:flex-row-reverse' : ''}`}>
        <div className="md:w-1/2">
          <img
            src={image.url}
            alt={image.alt || ''}
            className="h-auto w-full rounded-lg object-cover"
          />
        </div>
        <div className="md:w-1/2">
          {heading && <h2 className="mb-4 text-2xl font-bold">{heading}</h2>}
          <div className="prose max-w-none">
            {/* @ts-expect-error Payload rich text data type */}
            <RichText data={text} />
          </div>
        </div>
      </div>
    </section>
  )
}
