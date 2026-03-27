import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'newsletter-subscribers',
      where: { unsubscribeToken: { equals: token } },
      limit: 1,
    })

    if (result.docs.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    await payload.update({
      collection: 'newsletter-subscribers',
      id: result.docs[0].id,
      data: { status: 'unsubscribed' },
    })

    // Return a simple HTML page
    return new NextResponse(
      `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>配信停止完了</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px 20px;">
        <h1>配信停止が完了しました</h1>
        <p>メールマガジンの配信を停止しました。</p>
        <p><a href="/">uballoon トップページへ</a></p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
