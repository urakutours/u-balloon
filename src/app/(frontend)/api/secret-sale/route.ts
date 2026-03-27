import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const { slug, password } = await req.json()

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'secret-sales',
      where: {
        slug: { equals: slug },
        status: { equals: 'active' },
      },
      limit: 1,
      depth: 2,
    })

    const sale = result.docs[0] as any
    if (!sale) {
      return NextResponse.json({ error: 'セールが見つかりません' }, { status: 404 })
    }

    // Check validity dates
    const now = new Date()
    if (sale.validFrom && new Date(sale.validFrom) > now) {
      return NextResponse.json({ error: 'このセールはまだ開始していません' }, { status: 403 })
    }
    if (sale.validUntil && new Date(sale.validUntil) < now) {
      return NextResponse.json({ error: 'このセールは終了しました' }, { status: 403 })
    }

    // Check password if required
    if (sale.accessType === 'password') {
      if (!password || password !== sale.password) {
        return NextResponse.json({
          error: 'パスワードが正しくありません',
          requiresPassword: true,
        }, { status: 401 })
      }
    }

    // Return sale data without exposing password
    return NextResponse.json({
      name: sale.name,
      description: sale.description,
      bannerImage: sale.bannerImage,
      products: sale.products,
      validUntil: sale.validUntil,
    })
  } catch (error) {
    console.error('Secret sale error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
