import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal, userId } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'クーポンコードを入力してください' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'promotions',
      where: {
        code: { equals: code.toUpperCase() },
        status: { equals: 'active' },
      },
      limit: 1,
    })

    const promo = result.docs[0] as any
    if (!promo) {
      return NextResponse.json({ error: '無効なクーポンコードです' }, { status: 400 })
    }

    const now = new Date()

    // Check validity dates
    if (promo.validFrom && new Date(promo.validFrom) > now) {
      return NextResponse.json({ error: 'このクーポンはまだ有効期間前です' }, { status: 400 })
    }
    if (promo.validUntil && new Date(promo.validUntil) < now) {
      return NextResponse.json({ error: 'このクーポンは有効期限切れです' }, { status: 400 })
    }

    // Check usage limit
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      return NextResponse.json({ error: 'このクーポンは利用上限に達しました' }, { status: 400 })
    }

    // Check minimum order amount
    if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
      return NextResponse.json({
        error: `¥${promo.minOrderAmount.toLocaleString()}以上の注文に適用できます`,
      }, { status: 400 })
    }

    // Calculate discount
    let discount = 0
    if (promo.discountType === 'percentage') {
      discount = Math.floor(subtotal * (promo.discountValue / 100))
      if (promo.maxDiscountAmount) {
        discount = Math.min(discount, promo.maxDiscountAmount)
      }
    } else if (promo.discountType === 'fixed') {
      discount = promo.discountValue
    }
    // free_shipping handled by the checkout flow

    return NextResponse.json({
      valid: true,
      promotionId: promo.id,
      name: promo.name,
      discountType: promo.discountType,
      discount,
      freeShipping: promo.discountType === 'free_shipping',
    })
  } catch (error) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
