import Link from 'next/link'

type Button = {
  label: string
  link: string
  variant?: 'primary' | 'secondary' | 'outline'
}

type Props = {
  heading: string
  description?: string
  buttons: Button[]
  background?: 'white' | 'brand' | 'gray'
}

const bgClass = {
  white: 'bg-white',
  brand: 'bg-pink-50',
  gray: 'bg-gray-50',
}

const btnClass = {
  primary: 'bg-pink-500 text-white hover:bg-pink-600',
  secondary: 'bg-gray-800 text-white hover:bg-gray-900',
  outline: 'border-2 border-pink-500 text-pink-500 hover:bg-pink-50',
}

export function CTABlockRenderer({ heading, description, buttons, background = 'white' }: Props) {
  return (
    <section className={`${bgClass[background]} py-16`}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold">{heading}</h2>
        {description && <p className="mt-4 text-lg text-gray-600">{description}</p>}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {buttons?.map((btn, i) => (
            <Link
              key={i}
              href={btn.link}
              className={`rounded-full px-8 py-3 font-semibold transition ${btnClass[btn.variant || 'primary']}`}
            >
              {btn.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
