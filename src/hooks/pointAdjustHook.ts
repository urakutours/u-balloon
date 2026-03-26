import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Users.pointsが管理画面から直接変更された場合に
 * PointTransactionsにtype='adjust'のレコードを自動作成する
 *
 * Note: context.skipPointAdjustHook が true の場合はスキップ
 * (earnPoints等のプログラム的な更新時に使用)
 */
export const beforeUserPointsChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
  context,
}) => {
  if (operation !== 'update' || !originalDoc) return data

  // Skip if called from points module (to avoid double transactions)
  if (context?.skipPointAdjustHook) return data

  const newPoints = data.points
  const oldPoints = originalDoc.points ?? 0

  // pointsフィールドが変更されていない場合はスキップ
  if (newPoints === undefined || newPoints === oldPoints) return data

  const diff = newPoints - oldPoints
  const payload = req.payload

  try {
    await payload.create({
      collection: 'point-transactions',
      data: {
        user: originalDoc.id,
        type: 'adjust',
        amount: diff,
        balance: newPoints,
        description: `管理者によるポイント手動調整 (${diff >= 0 ? '+' : ''}${diff})`,
        createdBy: req.user?.id || undefined,
      },
    })
  } catch (err) {
    console.error('Point adjust hook error:', err)
  }

  return data
}
