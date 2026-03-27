import Link from 'next/link'

type Props = {
  heading: string
  subheading?: string
  image?: { url: string; alt: string }
  ctaLabel?: string
  ctaLink?: string
  overlay?: boolean
}

export function HeroBlockRenderer({ heading, subheading, image, ctaLabel, ctaLink, overlay }: Props) {
  return (
    <section className="relative flex min-h-[400px] items-center justify-center overflow-hidden">
      {image?.url && (
        <img
          src={image.url}
          alt={image.alt || ''}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {overlay && <div className="absolute inset-0 bg-black/40" />}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center text-white">
        <h1 className="text-4xl font-bold md:text-5xl">{heading}</h1>
        {subheading && <p className="mt-4 text-lg md:text-xl">{subheading}</p>}
        {ctaLabel && ctaLink && (
          <Link
            href={ctaLink}
            className="mt-8 inline-block rounded-full bg-pink-500 px-8 py-3 font-semibold text-white transition hover:bg-pink-600"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  )
}
