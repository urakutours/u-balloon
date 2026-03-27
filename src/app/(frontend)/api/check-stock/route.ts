import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json() as {
      items: Array<{ productId: string; quantity: number }>
    }

    if (!items?.length) {
      return NextResponse.json({ error: 'items required' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const outOfStock: string[] = []

    for (const item of items) {
      let product
      try {
        product = await payload.findByID({
          collection: 'products',
          id: item.productId,
        })
      } catch {
        return NextResponse.json({ error: `商品が見つかりません: ${item.productId}` }, { status: 400 })
      }

      const stock = product.stock as number | null | undefined
      // null/undefined means unlimited stock
      if (stock != null && stock < item.quantity) {
        outOfStock.push(
          `${product.title}: 残り${stock}個（${item.quantity}個ご注文）`
        )
      }
    }

    if (outOfStock.length > 0) {
      return NextResponse.json({
        available: false,
        messages: outOfStock,
      })
    }

    return NextResponse.json({ available: true })
  } catch (error) {
    console.error('Stock check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
