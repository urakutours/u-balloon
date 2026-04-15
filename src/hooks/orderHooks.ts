import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { earnPoints } from '@/lib/points'
import { sendEmail } from '@/lib/email'
import { OrderConfirmEmail, OrderStatusUpdateEmail, PointsEarnedEmail } from '@/lib/email-templates'
import type { OrderConfirmEmailProps } from '@/lib/email-templates'
import { sendAdminAlert } from '@/lib/admin-alerts'
import { getSiteSettings } from '@/lib/site-settings'
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

    // Build base email props common to all payment methods
    const baseEmailProps = {
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
      // T2.5 で OrderConfirmEmail の props 型拡張後に受け取られる追加フィールド
      shippingPlanName: (doc.shippingPlanName as string | undefined) ?? undefined,
      scheduledShipDate: (doc.scheduledShipDate as string | undefined) ?? undefined,
    }

    // For bank_transfer orders, add payment-specific props
    let emailProps: OrderConfirmEmailProps = baseEmailProps
    if (doc.paymentMethod === 'bank_transfer') {
      const settings = await getSiteSettings()
      emailProps = {
        ...baseEmailProps,
        paymentMethod: 'bank_transfer',
        bankInfo: {
          bankName: settings.bankName ?? '',
          branchName: settings.bankBranchName ?? '',
          accountType: settings.bankAccountType ?? '',
          accountNumber: settings.bankAccountNumber ?? '',
          accountHolder: settings.bankAccountHolder ?? '',
        },
        bankTransferDeadline: (doc.bankTransferDeadline as string | undefined) ?? undefined,
      }
    }

    await sendEmail({
      to: (customer as { email: string }).email,
      subject: `【uballoon】ご注文確認 ${doc.orderNumber}`,
      react: React.createElement(OrderConfirmEmail, emailProps as OrderConfirmEmailProps),
    })
    console.log('[Hook] Order confirm email sent for', doc.orderNumber)

    // Admin alert for new order
    sendAdminAlert({
      type: 'new_order',
      title: `新規注文 ${doc.orderNumber}`,
      details: `顧客: ${(customer as { name?: string; email: string }).name || (customer as { email: string }).email}\n合計: ¥${(doc.totalAmount as number).toLocaleString()}\n商品数: ${items.length}`,
    }).catch(console.error)
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
        scheduledShipDate: doc.scheduledShipDate as string | undefined,
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

    // If cancelled -> return used points + admin alert
    if (doc.status === 'cancelled' && previousDoc.status !== 'cancelled') {
      sendAdminAlert({
        type: 'order_cancelled',
        title: `注文キャンセル ${doc.orderNumber}`,
        details: `顧客: ${customerName}\n合計: ¥${(doc.totalAmount as number).toLocaleString()}`,
        urgency: 'high',
      }).catch(console.error)
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

async function deductStock(payload: Payload, doc: Record<string, unknown>) {
  try {
    const items = (doc.items as Array<Record<string, unknown>>) || []
    for (const item of items) {
      const productId = typeof item.product === 'object'
        ? (item.product as { id: string }).id
        : (item.product as string)
      const quantity = (item.quantity as number) || 1

      const product = await payload.findByID({ collection: 'products', id: productId })
      const currentStock = product.stock as number | null | undefined

      // Only deduct if stock tracking is enabled (stock is not null/undefined)
      if (currentStock != null) {
        const newStock = Math.max(0, currentStock - quantity)
        await payload.update({
          collection: 'products',
          id: productId,
          data: { stock: newStock },
        })
        console.log(`[Hook] Stock deducted: ${product.title} ${currentStock} -> ${newStock}`)

        // Check low stock threshold
        const threshold = (product.lowStockThreshold as number) ?? 5
        if (newStock <= threshold && currentStock > threshold) {
          console.warn(`[Hook] LOW STOCK ALERT: ${product.title} has ${newStock} remaining (threshold: ${threshold})`)
          sendAdminAlert({
            type: 'low_stock',
            title: `${product.title} の在庫が残り ${newStock} 個`,
            details: `SKU: ${product.sku || 'N/A'}\n閾値: ${threshold}\n現在の在庫: ${newStock}`,
            urgency: newStock === 0 ? 'high' : 'normal',
          }).catch(console.error)
        }
      }
    }
  } catch (err) {
    console.error('[Hook] Stock deduction error:', err)
  }
}

async function restoreStock(payload: Payload, doc: Record<string, unknown>) {
  try {
    const items = (doc.items as Array<Record<string, unknown>>) || []
    for (const item of items) {
      const productId = typeof item.product === 'object'
        ? (item.product as { id: string }).id
        : (item.product as string)
      const quantity = (item.quantity as number) || 1

      const product = await payload.findByID({ collection: 'products', id: productId })
      const currentStock = product.stock as number | null | undefined

      if (currentStock != null) {
        const newStock = currentStock + quantity
        await payload.update({
          collection: 'products',
          id: productId,
          data: { stock: newStock },
        })
        console.log(`[Hook] Stock restored: ${product.title} ${currentStock} -> ${newStock}`)
      }
    }
  } catch (err) {
    console.error('[Hook] Stock restore error:', err)
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

export const beforeOrderStatusChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation !== 'update' || !originalDoc) return data

  const newStatus = data.status
  const oldStatus = originalDoc.status

  if (newStatus === oldStatus) return data

  // Validate: shipped requires tracking number
  if (newStatus === 'shipped') {
    const trackingNumber = data.trackingInfo?.trackingNumber || originalDoc.trackingInfo?.trackingNumber
    if (!trackingNumber) {
      throw new Error('発送済みに変更するには、追跡番号を入力してください。（配送・日程タブ）')
    }
  }

  // Validate: bank transfer confirmation required
  if (newStatus === 'confirmed' &&
      (data.paymentMethod || originalDoc.paymentMethod) === 'bank_transfer') {
    const confirmedAt = data.bankTransferConfirmedAt || originalDoc.bankTransferConfirmedAt
    if (!confirmedAt) {
      throw new Error('銀行振込の注文を確認済みにするには、入金確認日を入力してください。（決済タブ）')
    }
  }

  // Validate: delivered must come after shipped
  if (newStatus === 'delivered' && oldStatus !== 'shipped') {
    throw new Error('配達完了に変更するには、先にステータスを「発送済み」にしてください。')
  }

  return data
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

    // Deduct stock for ordered products
    deductStock(payload, doc).catch((err) =>
      console.error('[Hook] Unhandled error in deductStock:', err),
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

    // Create audit log entry for status change
    const statusLabels: Record<string, string> = {
      pending: '保留中',
      awaiting_payment: '入金待ち',
      confirmed: '確認済み',
      preparing: '準備中',
      shipped: '発送済み',
      delivered: '配達完了',
      cancelled: 'キャンセル',
    }
    const oldStatus = previousDoc.status as string
    const newStatus = doc.status as string
    payload.create({
      collection: 'order-audit-logs',
      data: {
        order: doc.id,
        action: `ステータス変更: ${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}`,
        previousStatus: oldStatus,
        newStatus: newStatus,
        changedBy: req.user?.id || null,
      },
    }).catch((err) =>
      console.error('[Hook] Audit log creation error:', err),
    )

    // Restore stock if order is cancelled
    if (doc.status === 'cancelled' && previousDoc.status !== 'cancelled') {
      restoreStock(payload, doc).catch((err) =>
        console.error('[Hook] Unhandled error in restoreStock:', err),
      )
    }
  }

  return doc
}
