import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Verify admin
    const authResult = await payload.auth({ headers: req.headers })
    if (!authResult.user || (authResult.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newsletterId, testOnly } = await req.json()

    const newsletter = await payload.findByID({
      collection: 'newsletters',
      id: newsletterId,
    }) as any

    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const resend = new Resend(resendApiKey)
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@uballoon.com'
    const fromName = process.env.EMAIL_FROM_NAME || 'uballoon'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uballoon.com'

    // Test send
    if (testOnly && newsletter.testEmail) {
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: newsletter.testEmail,
        subject: `[テスト] ${newsletter.subject}`,
        html: `<p>これはテスト送信です</p><p>本文プレビュー: ${newsletter.subject}</p>`,
      })
      return NextResponse.json({ success: true, message: 'テストメールを送信しました' })
    }

    // Fetch active subscribers
    const subscribers = await payload.find({
      collection: 'newsletter-subscribers',
      where: { status: { equals: 'active' } },
      limit: 10000,
    })

    if (subscribers.docs.length === 0) {
      return NextResponse.json({ error: 'No active subscribers' }, { status: 400 })
    }

    // Update status to sending
    await payload.update({
      collection: 'newsletters',
      id: newsletterId,
      data: { status: 'sending' },
    })

    // Send emails (batch with Resend)
    let sentCount = 0
    const batchSize = 50

    for (let i = 0; i < subscribers.docs.length; i += batchSize) {
      const batch = subscribers.docs.slice(i, i + batchSize) as any[]

      await Promise.allSettled(
        batch.map((subscriber) =>
          resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: subscriber.email,
            subject: newsletter.subject,
            html: `<div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
              <h2 style="text-align:center;">🎈 uballoon</h2>
              <hr />
              <div>${newsletter.subject}</div>
              <hr />
              <p style="font-size:12px;color:#888;text-align:center;">
                <a href="${appUrl}/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}">配信停止</a>
              </p>
            </div>`,
          }).then(() => { sentCount++ }),
        ),
      )
    }

    // Update newsletter status
    await payload.update({
      collection: 'newsletters',
      id: newsletterId,
      data: {
        status: 'sent',
        sentAt: new Date().toISOString(),
        recipientCount: sentCount,
      },
    })

    return NextResponse.json({
      success: true,
      sentCount,
      totalSubscribers: subscribers.docs.length,
    })
  } catch (error) {
    console.error('Send newsletter error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
