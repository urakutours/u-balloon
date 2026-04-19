import { NextRequest, NextResponse } from 'next/server'
import { getPayload, type Where } from 'payload'
import config from '@payload-config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    const { user } = await payload.auth({ headers: req.headers })
    if (!user || (user as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const kind = searchParams.get('kind') ?? 'recent'

    if (kind === 'count') {
      const result = await payload.find({
        collection: 'form-submissions',
        where: { status: { equals: 'new' } },
        limit: 0,
        depth: 0,
      })
      return NextResponse.json({ count: result.totalDocs })
    }

    const whereClause: Where =
      kind === 'unresponded'
        ? { status: { equals: 'new' } }
        : { id: { exists: true } }

    const limit = kind === 'unresponded' ? 50 : 20

    const result = await payload.find({
      collection: 'form-submissions',
      where: whereClause,
      sort: '-createdAt',
      limit,
      depth: 1,
    })

    const inquiries = result.docs.map((doc) => {
      const form = doc.form as { title?: string } | null
      const dataRaw = doc.data as Record<string, unknown> | null
      let dataPreview = ''
      if (dataRaw && typeof dataRaw === 'object') {
        for (const [, v] of Object.entries(dataRaw)) {
          if (typeof v === 'string' && v.trim()) {
            dataPreview = v.trim().slice(0, 50)
            break
          }
        }
      }
      return {
        id: String(doc.id),
        formTitle: form?.title ?? 'フォーム',
        submitterEmail: (doc.submitterEmail as string | null) ?? null,
        status: (doc.status as string) ?? 'new',
        createdAt: doc.createdAt as string,
        dataPreview,
      }
    })

    return NextResponse.json({ inquiries })
  } catch (err) {
    console.error('[dashboard/inquiries] error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: '問い合わせデータの取得に失敗しました' }, { status: 500 })
  }
}
