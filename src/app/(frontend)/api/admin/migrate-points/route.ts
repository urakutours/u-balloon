import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Admin認証確認
    const { user } = await payload.auth({ headers: req.headers })
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await req.json()
    const migrations: Array<{ legacyId: string; points: number; expiresAt?: string }> = body.data || body

    if (!Array.isArray(migrations) || migrations.length === 0) {
      return NextResponse.json({ error: 'dataは配列で指定してください' }, { status: 400 })
    }

    const results: Array<{ legacyId: string; status: string; message?: string }> = []

    for (const item of migrations) {
      try {
        // legacyIdでユーザーを検索
        const users = await payload.find({
          collection: 'users',
          where: { legacyId: { equals: item.legacyId } },
          limit: 1,
        })

        if (users.docs.length === 0) {
          results.push({ legacyId: item.legacyId, status: 'error', message: 'ユーザーが見つかりません' })
          continue
        }

        const targetUser = users.docs[0]
        const currentPoints = (targetUser.points as number) ?? 0
        const newBalance = currentPoints + item.points

        // PointTransactionを作成
        await payload.create({
          collection: 'point-transactions',
          data: {
            user: targetUser.id,
            type: 'migration',
            amount: item.points,
            balance: newBalance,
            description: `MakeShop移行ポイント (legacyId: ${item.legacyId})`,
            expiresAt: item.expiresAt || undefined,
            createdBy: user.id,
          },
        })

        // ユーザーのポイント残高更新
        await payload.update({
          collection: 'users',
          id: targetUser.id,
          data: { points: newBalance },
          context: { skipPointAdjustHook: true },
        })

        results.push({ legacyId: item.legacyId, status: 'success' })
      } catch (err) {
        results.push({
          legacyId: item.legacyId,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length
    const errorCount = results.filter((r) => r.status === 'error').length

    return NextResponse.json({
      summary: { total: migrations.length, success: successCount, errors: errorCount },
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
