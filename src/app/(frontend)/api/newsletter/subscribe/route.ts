import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスを入力してください' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Check if already subscribed
    const existing = await payload.find({
      collection: 'newsletter-subscribers',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const subscriber = existing.docs[0] as any
      if (subscriber.status === 'active') {
        return NextResponse.json({ message: 'すでにメルマガに登録済みです' })
      }
      // Re-subscribe
      await payload.update({
        collection: 'newsletter-subscribers',
        id: subscriber.id,
        data: { status: 'active', name: name || subscriber.name },
      })
      return NextResponse.json({ message: 'メルマガの購読を再開しました' })
    }

    await payload.create({
      collection: 'newsletter-subscribers',
      data: { email, name, status: 'active', source: 'website' },
    })

    return NextResponse.json({ message: 'メルマガへの登録が完了しました' })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
