import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sendEmail } from '@/lib/email'
import React from 'react'
import {
  ShippingNotificationEmail,
  DelayNotificationEmail,
  OrderStatusUpdateEmail,
} from '@/lib/email-templates'
import { getBrand } from '@/lib/brand'

const TRACKING_URLS: Record<string, (n: string) => string> = {
  yamato: (n) => `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${n}`,
  yupack: (n) => `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${n}`,
  sagawa: (n) => `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${n}`,
}

const CARRIER_LABELS: Record<string, string> = {
  yamato: 'ヤマト運輸',
  yupack: 'ゆうパック',
  sagawa: '佐川急便',
  other: 'その他',
}

type SendEmailRequest = {
  orderId: string
  type: 'shipping' | 'delay' | 'custom'
  // Shipping
  carrier?: string
  trackingNumber?: string
  // Delay
  reason?: string
  newEstimate?: string
  // Custom
  subject?: string
  body?: string
}

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Verify admin
    const authResult = await payload.auth({ headers: req.headers })
    if (!authResult.user || (authResult.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SendEmailRequest = await req.json()
    const { orderId, type } = body

    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 1,
    })

    const customer = order.customer as any
    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 })
    }

    const customerName = customer.name || customer.email
    const brand = await getBrand()

    switch (type) {
      case 'shipping': {
        const carrier = body.carrier || 'other'
        const trackingNumber = body.trackingNumber || ''
        const trackingUrl = TRACKING_URLS[carrier]?.(trackingNumber)

        await sendEmail({
          to: customer.email,
          subject: `${brand.subjectPrefix}発送のお知らせ ${order.orderNumber}`,
          react: React.createElement(ShippingNotificationEmail, {
            name: customerName,
            orderNumber: order.orderNumber as string,
            carrier: CARRIER_LABELS[carrier] || carrier,
            trackingNumber,
            trackingUrl,
            brandName: brand.name,
            emailFooterTagline: brand.emailFooterTagline,
          }),
        })

        // Update order with tracking info
        await payload.update({
          collection: 'orders',
          id: orderId,
          data: {
            status: 'shipped',
            trackingInfo: { carrier, trackingNumber },
          },
        })

        break
      }

      case 'delay': {
        await sendEmail({
          to: customer.email,
          subject: `${brand.subjectPrefix}配送遅延のお知らせ ${order.orderNumber}`,
          react: React.createElement(DelayNotificationEmail, {
            name: customerName,
            orderNumber: order.orderNumber as string,
            reason: body.reason || '配送事情により遅延が発生しております',
            newEstimate: body.newEstimate,
            brandName: brand.name,
            emailFooterTagline: brand.emailFooterTagline,
          }),
        })
        break
      }

      case 'custom': {
        if (!body.subject || !body.body) {
          return NextResponse.json({ error: 'subject and body are required for custom emails' }, { status: 400 })
        }
        // Use simple text email for custom messages
        await sendEmail({
          to: customer.email,
          subject: body.subject,
          react: React.createElement(OrderStatusUpdateEmail, {
            name: customerName,
            orderNumber: order.orderNumber as string,
            newStatus: body.body,
            brandName: brand.name,
            emailFooterTagline: brand.emailFooterTagline,
          }),
        })
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send customer email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
