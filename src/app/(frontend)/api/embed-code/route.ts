import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('productId')
  const theme = req.nextUrl.searchParams.get('theme') || 'light'
  // NEXT_PUBLIC_APP_URL must be set per-instance. No shop-specific fallback.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

  const embedCode = `<!-- uballoon 商品ウィジェット -->
<div data-uballoon-product="${productId}" data-theme="${theme}"></div>
<script src="${appUrl}/embed.js" async></script>`

  return NextResponse.json({ embedCode })
}
