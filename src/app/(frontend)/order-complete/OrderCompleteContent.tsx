'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Loader2, Package, MapPin, CalendarDays, Gift, Building2 } from 'lucide-react'
import { purchase as trackPurchase } from '@/lib/gtag'

type OrderItem = {
  product: { title?: string; id: string } | string
  quantity: number
  unitPrice: number
  selectedOptions?: Record<string, unknown>
}

type BankInfo = {
  bankName: string | null
  branchName: string | null
  accountType: string | null
  accountNumber: string | null
  accountHolder: string | null
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
  shippingPlanName?: string | null
  scheduledShipDate?: string | null
  status: string
  createdAt: string
  paymentMethod?: 'stripe' | 'bank_transfer'
  bankTransferDeadline?: string | null
  bankInfo?: BankInfo | null
}

/**
 * YYYY-MM-DD 形式の文字列を local time で Date に変換する。
 * new Date('YYYY-MM-DD') は UTC 解釈になりブラウザ環境で 1 日ずれるため専用パーサを使う。
 * ISO 8601 タイムゾーン付き文字列はそのまま new Date() に渡す。
 */
function parseDateStr(dateStr: string): Date {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(dateStr)
}

function formatAccountType(type: string | null | undefined): string {
  if (!type) return '-'
  if (type === 'checking') return '当座'
  if (type === 'ordinary' || type === 'savings' || type === 'normal') return '普通'
  return type
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

          // GA4: purchase — fire once per order (dedupe via sessionStorage)
          try {
            const storageKey = `ga4_purchase_tracked_${fetchedOrder.id}`
            if (!sessionStorage.getItem(storageKey)) {
              const items = (fetchedOrder.items || []).map((item) => {
                const productObj =
                  typeof item.product === 'object' && item.product ? item.product : null
                const itemId =
                  (productObj && productObj.id) ||
                  (typeof item.product === 'string' ? item.product : 'unknown')
                const itemName = productObj?.title || '商品'
                return {
                  item_id: itemId,
                  item_name: itemName,
                  price: item.unitPrice,
                  quantity: item.quantity,
                }
              })
              trackPurchase(
                fetchedOrder.orderNumber || fetchedOrder.id,
                items,
                fetchedOrder.totalAmount ?? 0,
                fetchedOrder.shippingFee ?? 0,
              )
              sessionStorage.setItem(storageKey, 'true')
            }
          } catch (e) {
            console.warn('GA4 purchase failed:', e)
          }
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

      {(order.deliveryAddress || order.desiredArrivalDate || order.shippingPlanName || order.scheduledShipDate) && (
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
              {order.shippingPlanName && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">配送方法:</span>
                    <span className="ml-2">{order.shippingPlanName}</span>
                  </span>
                </div>
              )}
              {order.scheduledShipDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">発送予定日:</span>
                    <span className="ml-2">
                      {parseDateStr(order.scheduledShipDate).toLocaleDateString('ja-JP')}
                    </span>
                  </span>
                </div>
              )}
              {order.desiredArrivalDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>
                    到着希望日: {parseDateStr(order.desiredArrivalDate).toLocaleDateString('ja-JP')}
                    {order.desiredTimeSlot && ` ${timeSlotLabels[order.desiredTimeSlot] || order.desiredTimeSlot}`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {order.paymentMethod === 'bank_transfer' && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <Building2 className="h-4 w-4" />
              お振込先情報
            </h3>
            {order.bankInfo && (order.bankInfo.bankName || order.bankInfo.accountNumber) ? (
              <>
                <dl className="space-y-2 text-sm">
                  {order.bankInfo.bankName && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">銀行名</dt>
                      <dd className="font-medium">{order.bankInfo.bankName}</dd>
                    </div>
                  )}
                  {order.bankInfo.branchName && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">支店名</dt>
                      <dd className="font-medium">{order.bankInfo.branchName}</dd>
                    </div>
                  )}
                  {order.bankInfo.accountType && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">口座種別</dt>
                      <dd className="font-medium">{formatAccountType(order.bankInfo.accountType)}</dd>
                    </div>
                  )}
                  {order.bankInfo.accountNumber && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">口座番号</dt>
                      <dd className="font-medium font-mono">{order.bankInfo.accountNumber}</dd>
                    </div>
                  )}
                  {order.bankInfo.accountHolder && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">口座名義</dt>
                      <dd className="font-medium">{order.bankInfo.accountHolder}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">振込金額</dt>
                    <dd className="font-bold text-amber-800">¥{(order.totalAmount ?? 0).toLocaleString()}</dd>
                  </div>
                  {order.bankTransferDeadline && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">振込期限</dt>
                      <dd className="font-bold text-red-600">
                        {new Date(order.bankTransferDeadline).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  ※振込手数料はお客様ご負担となります。期限までに入金が確認できない場合、注文はキャンセルとなります。
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                振込先情報は確認メールに記載しております。メールをご確認ください。
              </p>
            )}
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
