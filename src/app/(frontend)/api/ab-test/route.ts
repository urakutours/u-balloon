import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')

  if (!productId) {
    return NextResponse.json({ variant: null })
  }

  try {
    const payload = await getPayload({ config })

    const tests = await payload.find({
      collection: 'ab-tests',
      where: {
        product: { equals: productId },
        status: { equals: 'running' },
      },
      limit: 1,
      depth: 1,
    })

    const test = tests.docs[0] as any
    if (!test || !test.variants?.length) {
      return NextResponse.json({ variant: null })
    }

    // Weighted random selection
    const totalWeight = test.variants.reduce((sum: number, v: any) => sum + (v.weight || 0), 0)
    let random = Math.random() * totalWeight
    let selectedVariant = test.variants[0]

    for (const variant of test.variants) {
      random -= variant.weight || 0
      if (random <= 0) {
        selectedVariant = variant
        break
      }
    }

    // Increment impressions (fire-and-forget)
    const variantIndex = test.variants.findIndex((v: any) => v.variantId === selectedVariant.variantId)
    if (variantIndex >= 0) {
      const updatedVariants = [...test.variants]
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        impressions: (updatedVariants[variantIndex].impressions || 0) + 1,
      }
      payload.update({
        collection: 'ab-tests',
        id: test.id,
        data: { variants: updatedVariants },
      }).catch(console.error)
    }

    return NextResponse.json({
      testId: test.id,
      variant: {
        variantId: selectedVariant.variantId,
        heroImage: selectedVariant.heroImage,
        headingOverride: selectedVariant.headingOverride,
        descriptionOverride: selectedVariant.descriptionOverride,
        ctaText: selectedVariant.ctaText,
      },
    })
  } catch (error) {
    console.error('AB test error:', error)
    return NextResponse.json({ variant: null })
  }
}

// Record conversion
export async function POST(req: NextRequest) {
  try {
    const { testId, variantId } = await req.json()

    if (!testId || !variantId) {
      return NextResponse.json({ error: 'testId and variantId required' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const test = await payload.findByID({ collection: 'ab-tests', id: testId }) as any

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }

    const variantIndex = test.variants?.findIndex((v: any) => v.variantId === variantId)
    if (variantIndex < 0) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    const updatedVariants = [...test.variants]
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      conversions: (updatedVariants[variantIndex].conversions || 0) + 1,
    }

    await payload.update({
      collection: 'ab-tests',
      id: testId,
      data: { variants: updatedVariants },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('AB test conversion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
