'use client'

import { HeroBlockRenderer } from './HeroBlock'
import { RichContentBlockRenderer } from './RichContentBlock'
import { ImageTextBlockRenderer } from './ImageTextBlock'
import { GalleryBlockRenderer } from './GalleryBlock'
import { CTABlockRenderer } from './CTABlock'
import { FAQBlockRenderer } from './FAQBlock'
import { SpacerBlockRenderer } from './SpacerBlock'

type Block = {
  blockType: string
  [key: string]: unknown
}

const blockComponents: Record<string, React.ComponentType<any>> = {
  hero: HeroBlockRenderer,
  richContent: RichContentBlockRenderer,
  imageText: ImageTextBlockRenderer,
  gallery: GalleryBlockRenderer,
  cta: CTABlockRenderer,
  faq: FAQBlockRenderer,
  spacer: SpacerBlockRenderer,
}

type Props = {
  blocks: Block[]
}

export function BlockRenderer({ blocks }: Props) {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block, i) => {
        const Component = blockComponents[block.blockType]
        if (!Component) return null
        const { blockType, id, blockName, ...rest } = block
        return <Component key={id || i} {...rest} />
      })}
    </>
  )
}
