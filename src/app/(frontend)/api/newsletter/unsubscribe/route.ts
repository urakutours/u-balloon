import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * トークンから配信停止処理を実行する共通関数。
 * GET（ブラウザクリック）と POST（RFC 8058 1-click unsubscribe）の両方から呼ぶ。
 */
async function performUnsubscribe(token: string | null): Promise<{
  ok: boolean
  status: number
  error?: string
}> {
  if (!token) {
    return { ok: false, status: 400, error: 'Invalid token' }
  }

  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'newsletter-subscribers',
    where: { unsubscribeToken: { equals: token } },
    limit: 1,
  })

  if (result.docs.length === 0) {
    return { ok: false, status: 404, error: 'Invalid token' }
  }

  await payload.update({
    collection: 'newsletter-subscribers',
    id: result.docs[0].id,
    data: { status: 'unsubscribed' },
  })

  return { ok: true, status: 200 }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    const result = await performUnsubscribe(token)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

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

/**
 * RFC 8058 1-click unsubscribe 対応。
 * メールクライアント（Gmail 等）が List-Unsubscribe-Post: List-Unsubscribe=One-Click を
 * 確認すると、このエンドポイントに POST を送る。
 * token は URL クエリでも body でも受け付ける。
 */
export async function POST(req: NextRequest) {
  try {
    // token は URL クエリ or form body から取得
    let token = req.nextUrl.searchParams.get('token')
    if (!token) {
      const contentType = req.headers.get('content-type') || ''
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData()
        token = (formData.get('token') as string | null) || null
      } else if (contentType.includes('application/json')) {
        const body = await req.json().catch(() => ({}))
        token = (body.token as string | null) || null
      }
    }

    const result = await performUnsubscribe(token)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // RFC 8058: 200 OK with minimal body
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter unsubscribe POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
