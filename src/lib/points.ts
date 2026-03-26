import type { Payload } from 'payload'

/**
 * ポイント付与: 商品合計金額の3%（小数点以下切り捨て）
 * 有効期限は付与日から1年後
 */
export async function earnPoints(payload: Payload, params: {
  userId: string | number
  orderId: string | number
  subtotal: number
}) {
  const { userId, orderId, subtotal } = params

  // 付与率3%、小数点以下切り捨て
  const pointsToEarn = Math.floor(subtotal * 0.03)
  if (pointsToEarn <= 0) return null

  // 現在のユーザーのポイント残高を取得
  const user = await payload.findByID({ collection: 'users', id: userId })
  const currentPoints = (user.points as number) ?? 0
  const newBalance = currentPoints + pointsToEarn

  // PointTransactionsにレコード作成
  const transaction = await payload.create({
    collection: 'point-transactions',
    data: {
      user: userId,
      type: 'earn',
      amount: pointsToEarn,
      balance: newBalance,
      order: orderId,
      description: `注文ポイント付与 (3%)`,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })

  // Usersのpoints残高を更新（skipPointAdjustHookで二重記録を防止）
  await payload.update({
    collection: 'users',
    id: userId,
    data: { points: newBalance },
    context: { skipPointAdjustHook: true },
  })

  return { transaction, pointsEarned: pointsToEarn, newBalance }
}

/**
 * ポイント使用
 */
export async function usePoints(payload: Payload, params: {
  userId: string | number
  orderId: string | number
  pointsToUse: number
}) {
  const { userId, orderId, pointsToUse } = params

  if (pointsToUse <= 0) throw new Error('使用ポイント数は1以上にしてください')

  // ユーザーの現在ポイントを取得
  const user = await payload.findByID({ collection: 'users', id: userId })
  const currentPoints = (user.points as number) ?? 0

  if (pointsToUse > currentPoints) {
    throw new Error(`ポイント不足です（保有: ${currentPoints}pt, 使用: ${pointsToUse}pt）`)
  }

  // 注文情報の取得
  const order = await payload.findByID({ collection: 'orders', id: orderId })
  const totalBeforePoints = (order.subtotal as number) + ((order.shippingFee as number) ?? 0)

  if (pointsToUse > totalBeforePoints) {
    throw new Error('注文合計を超えるポイントは使用できません')
  }

  const newBalance = currentPoints - pointsToUse

  // PointTransactionsにレコード作成（amountは負の値）
  const transaction = await payload.create({
    collection: 'point-transactions',
    data: {
      user: userId,
      type: 'use',
      amount: -pointsToUse,
      balance: newBalance,
      order: orderId,
      description: `ポイント使用`,
    },
  })

  // Users残高を減算
  await payload.update({
    collection: 'users',
    id: userId,
    data: { points: newBalance },
    context: { skipPointAdjustHook: true },
  })

  // Ordersのポイント使用・合計を更新
  const newTotal = totalBeforePoints - pointsToUse
  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      pointsUsed: pointsToUse,
      totalAmount: newTotal,
    },
  })

  return { transaction, newBalance, newTotalAmount: newTotal }
}

/**
 * ポイント手動調整（admin用）
 */
export async function adjustPoints(payload: Payload, params: {
  userId: string | number
  amount: number
  description: string
  createdBy?: string | number
}) {
  const { userId, amount, description, createdBy } = params

  const user = await payload.findByID({ collection: 'users', id: userId })
  const currentPoints = (user.points as number) ?? 0
  const newBalance = currentPoints + amount

  if (newBalance < 0) {
    throw new Error(`ポイント残高がマイナスになります（現在: ${currentPoints}pt, 調整: ${amount}pt）`)
  }

  const transaction = await payload.create({
    collection: 'point-transactions',
    data: {
      user: userId,
      type: 'adjust',
      amount,
      balance: newBalance,
      description: description || '手動調整',
      createdBy: createdBy || undefined,
    },
  })

  await payload.update({
    collection: 'users',
    id: userId,
    data: { points: newBalance },
    context: { skipPointAdjustHook: true },
  })

  return { transaction, newBalance }
}
