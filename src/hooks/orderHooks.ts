import type { CollectionAfterChangeHook } from 'payload'
import { earnPoints } from '@/lib/points'
import { sendEmail } from '@/lib/email'
import { OrderConfirmEmail, OrderStatusUpdateEmail, PointsEarnedEmail } from '@/lib/email-templates'
import React from 'react'
import type { Payload } from 'payload'

/**
 * Process order hooks asynchronously (fire-and-forget) to avoid blocking the API response.
 * Supabase remote DB operations can be slow, so we don't await them in the hook.
 */
async function processOrderCreate(payload: Payload, doc: Record<string, unknown>) {
  try {
    const customer = typeof doc.customer === 'object'
      ? (doc.customer as Record<string, unknown>)
      : await payload.findByID({ collection: 'users', id: doc.customer as string })

    const items = await Promise.all(
      ((doc.items as Array<Record<string, unknown>>) || []).map(async (item) => {
        const product = typeof item.product === 'object'
          ? (item.product as Record<string, unknown>)
          : await payload.findByID({ collection: 'products', id: item.product as string })
        return {
          productName: (product as { title?: string }).title || '商品',
          quantity: item.quantity as number,
          unitPrice: item.unitPrice as number,
        }
      }),
    )

    await sendEmail({
      to: (customer as { email: string }).email,
      subject: `【uballoon】ご注文確認 ${doc.orderNumber}`,
      react: React.createElement(OrderConfirmEmail, {
        name: ((customer as { name?: string }).name || (customer as { email: string }).email),
        orderNumber: doc.orderNumber as string,
        items,
        deliveryAddress: doc.deliveryAddress as string | undefined,
        desiredArrivalDate: doc.desiredArrivalDate
          ? new Date(doc.desiredArrivalDate as string).toLocaleDateString('ja-JP')
          : undefined,
        subtotal: doc.subtotal as number,
        shippingFee: (doc.shippingFee as number) || 0,
        pointsUsed: (doc.pointsUsed as number) || 0,
        totalAmount: doc.totalAmount as number,
      }),
    })
    console.log('[Hook] Order confirm email sent for', doc.orderNumber)
  } catch (err) {
    console.error('[Hook] Order confirm email error:', err)
  }
}

async function processOrderStatusChange(payload: Payload, doc: Record<string, unknown>, previousDoc: Record<string, unknown>) {
  try {
    const customer = typeof doc.customer === 'object'
      ? (doc.customer as Record<string, unknown>)
      : await payload.findByID({ collection: 'users', id: doc.customer as string })
    const customerEmail = (customer as { email: string }).email
    const customerName = (customer as { name?: string }).name || customerEmail

    // Send status update email
    await sendEmail({
      to: customerEmail,
      subject: `【uballoon】ご注文ステータス更新 ${doc.orderNumber}`,
      react: React.createElement(OrderStatusUpdateEmail, {
        name: customerName,
        orderNumber: doc.orderNumber as string,
        newStatus: doc.status as string,
      }),
    })
    console.log('[Hook] Status update email sent for', doc.orderNumber, '->', doc.status)

    // If confirmed -> earn points
    if (doc.status === 'confirmed' && previousDoc.status !== 'confirmed') {
      const customerId = typeof doc.customer === 'object'
        ? (doc.customer as { id: string }).id
        : (doc.customer as string)

      const result = await earnPoints(payload, {
        userId: customerId,
        orderId: doc.id as string,
        subtotal: doc.subtotal as number,
      })

      if (result) {
        // Update order's pointsEarned
        await payload.update({
          collection: 'orders',
          id: doc.id as string,
          data: { pointsEarned: result.pointsEarned },
        })

        // Send point earned email
        await sendEmail({
          to: customerEmail,
          subject: `【uballoon】ポイント付与のお知らせ`,
          react: React.createElement(PointsEarnedEmail, {
            name: customerName,
            pointsEarned: result.pointsEarned,
            newBalance: result.newBalance,
            orderNumber: doc.orderNumber as string,
          }),
        })
        console.log('[Hook] Points earned:', result.pointsEarned, 'for order', doc.orderNumber)
      }
    }

    // If cancelled -> return used points
    if (doc.status === 'cancelled' && previousDoc.status !== 'cancelled') {
      const pointsUsed = (doc.pointsUsed as number) ?? 0
      if (pointsUsed > 0) {
        const customerId = typeof doc.customer === 'object'
          ? (doc.customer as { id: string }).id
          : (doc.customer as string)

        try {
          const user = await payload.findByID({ collection: 'users', id: customerId })
          const currentPoints = (user.points as number) ?? 0
          const newBalance = currentPoints + pointsUsed

          await payload.create({
            collection: 'point-transactions',
            data: {
              user: customerId,
              type: 'adjust',
              amount: pointsUsed,
              balance: newBalance,
              order: doc.id,
              description: `ポイント返還（注文キャンセル: ${doc.orderNumber}）`,
            },
          })

          await payload.update({
            collection: 'users',
            id: customerId,
            data: { points: newBalance },
            context: { skipPointAdjustHook: true },
          })

          console.log('[Hook] Points returned:', pointsUsed, 'for cancelled order', doc.orderNumber)
        } catch (pointErr) {
          console.error('[Hook] Point return error for order', doc.orderNumber, ':', pointErr)
        }
      }
    }
  } catch (err) {
    console.error('[Hook] Order status change processing error:', err)
  }
}

async function updatePopularityScores(payload: Payload, doc: Record<string, unknown>) {
  try {
    const items = (doc.items as Array<Record<string, unknown>>) || []
    for (const item of items) {
      const productId = typeof item.product === 'object'
        ? (item.product as { id: string }).id
        : (item.product as string)
      const quantity = (item.quantity as number) || 1

      const product = await payload.findByID({ collection: 'products', id: productId })
      const currentScore = (product.popularityScore as number) || 0

      await payload.update({
        collection: 'products',
        id: productId,
        data: { popularityScore: currentScore + quantity },
      })
    }
    console.log('[Hook] Popularity scores updated for order', doc.orderNumber)
  } catch (err) {
    console.error('[Hook] Popularity score update error:', err)
  }
}

export const afterOrderChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const payload = req.payload

  // Fire-and-forget: don't await, so the API response returns immediately
  if (operation === 'create') {
    processOrderCreate(payload, doc).catch((err) =>
      console.error('[Hook] Unhandled error in processOrderCreate:', err),
    )

    // Increment popularity score for each ordered product
    updatePopularityScores(payload, doc).catch((err) =>
      console.error('[Hook] Unhandled error in updatePopularityScores:', err),
    )
  }

  if (operation === 'update' && previousDoc && doc.status !== previousDoc.status) {
    processOrderStatusChange(payload, doc, previousDoc).catch((err) =>
      console.error('[Hook] Unhandled error in processOrderStatusChange:', err),
    )
  }

  return doc
}
