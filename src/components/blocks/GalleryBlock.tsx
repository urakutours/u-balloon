type GalleryImage = {
  image: { url: string; alt: string }
  caption?: string
}

type Props = {
  heading?: string
  images: GalleryImage[]
  columns?: '2' | '3' | '4'
}

const colsClass = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

export function GalleryBlockRenderer({ heading, images, columns = '3' }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      {heading && <h2 className="mb-8 text-center text-2xl font-bold">{heading}</h2>}
      <div className={`grid gap-4 ${colsClass[columns]}`}>
        {images?.map((item, i) => (
          <figure key={i} className="overflow-hidden rounded-lg">
            <img
              src={item.image.url}
              alt={item.image.alt || ''}
              className="h-64 w-full object-cover transition hover:scale-105"
            />
            {item.caption && (
              <figcaption className="mt-2 text-center text-sm text-gray-600">
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}
