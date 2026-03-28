'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Loader2, Package, MapPin, CalendarDays, Gift } from 'lucide-react'

type OrderItem = {
  product: { title?: string; id: string } | string
  quantity: number
  unitPrice: number
  selectedOptions?: Record<string, unknown>
}

type OrderData = {
  id: string
  orderNumber: string
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  pointsUsed: number
  pointsEarned: number
  totalAmount: number
  deliveryAddress?: string
  desiredArrivalDate?: string
  desiredTimeSlot?: string
  status: string
  createdAt: string
}

const timeSlotLabels: Record<string, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
  night: '夜',
}

export default function OrderCompleteContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const orderId = searchParams.get('order_id')

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true)
      try {
        let fetchedOrder: OrderData | null = null

        if (orderId) {
          const res = await fetch(`/api/orders/${orderId}`, {
            credentials: 'include',
          })
          if (res.ok) {
            fetchedOrder = await res.json()
          }
        } else if (sessionId) {
          const res = await fetch(
            `/api/orders?where[stripeSessionId][equals]=${sessionId}&limit=1`,
            { credentials: 'include' },
          )
          if (res.ok) {
            const data = await res.json()
            if (data.docs && data.docs.length > 0) {
              fetchedOrder = data.docs[0]
            }
          }
        }

        if (fetchedOrder) {
          setOrder(fetchedOrder)
        } else {
          setError('注文情報が見つかりませんでした')
        }
      } catch {
        setError('注文情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    if (sessionId || orderId) {
      fetchOrder()
    } else {
      setLoading(false)
      setError('注文情報が指定されていません')
    }
  }, [sessionId, orderId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardContent className="p-8">
            <p className="mb-4 text-muted-foreground">{error || '注文情報が見つかりませんでした'}</p>
            <Link href="/products">
              <Button>商品一覧に戻る</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const estimatedPointsEarned = order.pointsEarned || Math.floor((order.subtotal ?? 0) * 0.03)

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
        <h1 className="mb-2 text-2xl font-bold text-brand-teal">ご注文ありがとうございます</h1>
        <p className="text-muted-foreground">
          注文が正常に作成されました。確認メールをお送りしますのでご確認ください。
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">注文番号</span>
            </div>
            <Badge variant="outline" className="text-base font-mono">
              {order.orderNumber}
            </Badge>
          </div>

          <Separator className="mb-4" />

          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">注文商品</h3>
          <div className="space-y-2 text-sm">
            {order.items.map((item, idx) => {
              const productName =
                typeof item.product === 'object' && item.product?.title
                  ? item.product.title
                  : '商品'
              return (
                <div key={idx} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {productName} × {item.quantity}
                  </span>
                  <span>¥{(item.unitPrice * item.quantity).toLocaleString()}</span>
                </div>
              )
            })}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">商品小計</span>
              <span>¥{(order.subtotal ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">送料</span>
              <span>¥{(order.shippingFee ?? 0).toLocaleString()}</span>
            </div>
            {(order.pointsUsed ?? 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>ポイント使用</span>
                <span>-¥{order.pointsUsed.toLocaleString()}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between text-lg font-bold">
            <span>合計</span>
            <span>¥{(order.totalAmount ?? 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {(order.deliveryAddress || order.desiredArrivalDate) && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">配送情報</h3>
            <div className="space-y-3 text-sm">
              {order.deliveryAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
              {order.desiredArrivalDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>
                    到着希望日: {new Date(order.desiredArrivalDate).toLocaleDateString('ja-JP')}
                    {order.desiredTimeSlot && ` ${timeSlotLabels[order.desiredTimeSlot] || order.desiredTimeSlot}`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {estimatedPointsEarned > 0 && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 p-4">
            <Gift className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-700">
                {estimatedPointsEarned.toLocaleString()} ポイント付与予定
              </p>
              <p className="text-xs text-green-600">
                注文確認後にポイントが付与されます（有効期限: 1年間）
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center gap-3">
        <Link href={`/account/orders/${order.id}`}>
          <Button variant="outline">注文詳細を確認</Button>
        </Link>
        <Link href="/products">
          <Button>買い物を続ける</Button>
        </Link>
      </div>
    </div>
  )
}
