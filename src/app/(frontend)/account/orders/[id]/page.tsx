'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  ArrowLeft,
  Package,
  MapPin,
  CalendarDays,
  Clock,
  CreditCard,
  Gift,
  FileText,
  CheckCircle2,
  Circle,
  Send,
  User,
} from 'lucide-react'

type OrderItem = {
  product: { title?: string; id: string } | string
  quantity: number
  unitPrice: number
  selectedOptions?: {
    subBalloons?: { name: string; additionalPrice: number }[]
    lettering?: { enabled: boolean; text: string; price: number }
    color?: { name: string; hexCode: string }
  }
}

type SenderInfo = {
  senderName?: string | null
  senderEmail?: string | null
  senderPhone?: string | null
  senderPostalCode?: string | null
  senderPrefecture?: string | null
  senderAddressLine1?: string | null
  senderAddressLine2?: string | null
}

type RecipientInfo = {
  recipientSameAsSender?: boolean | null
  recipientName?: string | null
  recipientNameKana?: string | null
  recipientPhone?: string | null
  recipientPostalCode?: string | null
  recipientPrefecture?: string | null
  recipientAddressLine1?: string | null
  recipientAddressLine2?: string | null
  recipientDesiredArrivalDate?: string | null
  recipientDesiredTimeSlotLabel?: string | null
}

type GiftSettings = {
  giftWrappingOptionName?: string | null
  giftWrappingFee?: number | null
  giftMessageCardText?: string | null
}

type UsageInfoData = {
  usageEventName?: string | null
  usageDate?: string | null
  usageTimeText?: string | null
}

type OrderData = {
  id: string
  orderNumber: string
  customer: { id: string; name?: string; email: string } | string | null
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  pointsUsed: number
  pointsEarned: number
  totalAmount: number
  deliveryAddress?: string
  deliveryDistance?: number
  desiredArrivalDate?: string
  desiredTimeSlot?: string
  eventDateTime?: string
  notes?: string
  status: string
  stripeSessionId?: string
  stripePaymentIntentId?: string
  createdAt: string
  updatedAt: string
  sender?: SenderInfo | null
  recipient?: RecipientInfo | null
  giftSettings?: GiftSettings | null
  usageInfo?: UsageInfoData | null
}

const statusSteps = [
  { key: 'pending', label: '保留中', icon: Clock },
  { key: 'confirmed', label: '確認済み', icon: CheckCircle2 },
  { key: 'preparing', label: '準備中', icon: Package },
  { key: 'shipped', label: '発送済み', icon: Package },
  { key: 'delivered', label: '配達完了', icon: CheckCircle2 },
]

const statusLabels: Record<string, string> = {
  pending: '保留中',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-brand-teal/10 text-brand-teal',
  preparing: 'bg-brand-pink-light text-brand-pink',
  shipped: 'bg-orange-100 text-orange-800',
  delivered: 'bg-brand-teal/15 text-brand-teal',
  cancelled: 'bg-red-100 text-red-800',
}

const timeSlotLabels: Record<string, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夕方',
  night: '夜',
}

function parseDateStr(dateStr: string): Date {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  }
  return new Date(dateStr)
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/account')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || !params.id) return

    const fetchOrder = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/orders/${params.id}`, {
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
        } else {
          setOrder(null)
        }
      } catch {
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [user, params.id])

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="mb-4 text-muted-foreground">注文が見つかりませんでした</p>
        <Link href="/account">
          <Button variant="outline">マイページに戻る</Button>
        </Link>
      </div>
    )
  }

  // Progress bar logic
  const isCancelled = order.status === 'cancelled'
  const currentStepIndex = statusSteps.findIndex((s) => s.key === order.status)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-brand-dark transition-colors">ホーム</Link>
        <span className="mx-1.5">&gt;</span>
        <Link href="/account" className="hover:text-brand-dark transition-colors">マイページ</Link>
        <span className="mx-1.5">&gt;</span>
        <span className="text-foreground">注文詳細</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/account">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-teal">注文詳細</h1>
          <p className="text-sm text-muted-foreground font-mono">{order.orderNumber}</p>
        </div>
        <Badge className={statusColors[order.status] || ''}>
          {statusLabels[order.status] || order.status}
        </Badge>
      </div>

      {/* Status Progress Bar */}
      {!isCancelled && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, idx) => {
                const isActive = idx <= currentStepIndex
                const isCurrent = idx === currentStepIndex
                const StepIcon = step.icon

                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isActive
                            ? isCurrent
                              ? 'border-brand-teal bg-brand-teal text-white'
                              : 'border-brand-teal bg-brand-teal/10 text-brand-teal'
                            : 'border-muted-foreground/30 text-muted-foreground/30'
                        }`}
                      >
                        {isActive && !isCurrent ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isActive ? (
                          <StepIcon className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] sm:text-xs ${
                          isActive ? 'font-semibold text-foreground' : 'text-muted-foreground/50'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < statusSteps.length - 1 && (
                      <div
                        className={`mx-1 h-0.5 flex-1 ${
                          idx < currentStepIndex ? 'bg-brand-teal' : 'bg-muted-foreground/20'
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancelled Banner */}
      {isCancelled && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 text-center text-red-700">
            <p className="font-semibold">この注文はキャンセルされました</p>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            注文商品
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item, idx) => {
              const productName =
                typeof item.product === 'object' && item.product?.title
                  ? item.product.title
                  : '商品'
              const opts = item.selectedOptions

              return (
                <div key={idx}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{productName}</p>
                      <p className="text-sm text-muted-foreground">
                        数量: {item.quantity} × ¥{item.unitPrice.toLocaleString()}
                      </p>
                      {/* Option details */}
                      {opts && (
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {opts.subBalloons?.map((sb, i) => (
                            <div key={i}>
                              サブバルーン: {sb.name}
                              {sb.additionalPrice > 0 && ` (+¥${sb.additionalPrice.toLocaleString()})`}
                            </div>
                          ))}
                          {opts.lettering?.enabled && (
                            <div>
                              文字入れ: {opts.lettering.text || '(あり)'}
                              {opts.lettering.price > 0 && ` (+¥${opts.lettering.price.toLocaleString()})`}
                            </div>
                          )}
                          {opts.color && (
                            <div className="flex items-center gap-1">
                              カラー: {opts.color.name}
                              <span
                                className="inline-block h-3 w-3 rounded-full border"
                                style={{ backgroundColor: opts.color.hexCode }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="font-medium">
                      ¥{(item.unitPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
                  {idx < order.items.length - 1 && <Separator className="mt-4" />}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            金額内訳
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <div className="flex justify-between text-brand-teal">
                <span>ポイント使用</span>
                <span>-¥{order.pointsUsed.toLocaleString()}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>合計</span>
              <span>¥{(order.totalAmount ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Points earned */}
          {(order.pointsEarned ?? 0) > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-md bg-brand-teal/10 p-3 text-sm text-brand-teal">
              <Gift className="h-4 w-4" />
              <span>{order.pointsEarned.toLocaleString()} ポイント付与済み</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            配送情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {order.deliveryAddress && (
              <div>
                <span className="text-muted-foreground">配送先住所</span>
                <p className="mt-0.5 font-medium">{order.deliveryAddress}</p>
              </div>
            )}
            {(order.deliveryDistance ?? 0) > 0 && (
              <div>
                <span className="text-muted-foreground">配送距離</span>
                <p className="mt-0.5 font-medium">{order.deliveryDistance}km</p>
              </div>
            )}
            {order.desiredArrivalDate && (
              <div>
                <span className="text-muted-foreground">到着希望日</span>
                <p className="mt-0.5 font-medium">
                  {new Date(order.desiredArrivalDate).toLocaleDateString('ja-JP')}
                  {order.desiredTimeSlot && ` ${timeSlotLabels[order.desiredTimeSlot] || order.desiredTimeSlot}`}
                </p>
              </div>
            )}
            {order.eventDateTime && (
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">イベント日時</span>
                  <p className="mt-0.5 font-medium">
                    {new Date(order.eventDateTime).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 注文者情報（旧称: 送り主情報） */}
      {order.sender && (order.sender.senderName || order.sender.senderPhone || order.sender.senderEmail) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              注文者情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {order.sender.senderName && (
                <div>
                  <span className="text-muted-foreground">氏名</span>
                  <p className="mt-0.5 font-medium">{order.sender.senderName}</p>
                </div>
              )}
              {order.sender.senderPhone && (
                <div>
                  <span className="text-muted-foreground">電話番号</span>
                  <p className="mt-0.5 font-medium">{order.sender.senderPhone}</p>
                </div>
              )}
              {order.sender.senderEmail && (
                <div>
                  <span className="text-muted-foreground">メールアドレス</span>
                  <p className="mt-0.5 font-medium">{order.sender.senderEmail}</p>
                </div>
              )}
              {(order.sender.senderPostalCode || order.sender.senderPrefecture || order.sender.senderAddressLine1) && (
                <div>
                  <span className="text-muted-foreground">住所</span>
                  <p className="mt-0.5 font-medium">
                    {[
                      order.sender.senderPostalCode ? `〒${order.sender.senderPostalCode}` : '',
                      order.sender.senderPrefecture,
                      order.sender.senderAddressLine1,
                      order.sender.senderAddressLine2,
                    ].filter(Boolean).join(' ')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 送り先情報（新フォーム対応） */}
      {order.recipient && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" />
              送り先情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.recipient.recipientSameAsSender ? (
              <p className="text-sm text-muted-foreground">注文者と同じ</p>
            ) : (
              <div className="space-y-2 text-sm">
                {order.recipient.recipientName && (
                  <div>
                    <span className="text-muted-foreground">氏名</span>
                    <p className="mt-0.5 font-medium">{order.recipient.recipientName}</p>
                  </div>
                )}
                {order.recipient.recipientPhone && (
                  <div>
                    <span className="text-muted-foreground">電話番号</span>
                    <p className="mt-0.5 font-medium">{order.recipient.recipientPhone}</p>
                  </div>
                )}
                {(order.recipient.recipientPostalCode || order.recipient.recipientPrefecture || order.recipient.recipientAddressLine1) && (
                  <div>
                    <span className="text-muted-foreground">住所</span>
                    <p className="mt-0.5 font-medium">
                      {[
                        order.recipient.recipientPostalCode ? `〒${order.recipient.recipientPostalCode}` : '',
                        order.recipient.recipientPrefecture,
                        order.recipient.recipientAddressLine1,
                        order.recipient.recipientAddressLine2,
                      ].filter(Boolean).join(' ')}
                    </p>
                  </div>
                )}
                {order.recipient.recipientDesiredArrivalDate && (
                  <div>
                    <span className="text-muted-foreground">到着希望日</span>
                    <p className="mt-0.5 font-medium">
                      {parseDateStr(order.recipient.recipientDesiredArrivalDate).toLocaleDateString('ja-JP')}
                      {order.recipient.recipientDesiredTimeSlotLabel && ` （${order.recipient.recipientDesiredTimeSlotLabel}）`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ギフト設定（新フォーム対応） */}
      {order.giftSettings && order.giftSettings.giftWrappingOptionName && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-4 w-4" />
              ギフト設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">ラッピング</span>
                <p className="mt-0.5 font-medium">
                  {order.giftSettings.giftWrappingOptionName}
                  {order.giftSettings.giftWrappingFee ? ` (+¥${order.giftSettings.giftWrappingFee.toLocaleString()})` : ''}
                </p>
              </div>
              {order.giftSettings.giftMessageCardText && (
                <div>
                  <span className="text-muted-foreground">メッセージカード</span>
                  <p className="mt-0.5 whitespace-pre-wrap font-medium">{order.giftSettings.giftMessageCardText}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用日時（新フォーム対応） */}
      {order.usageInfo && (order.usageInfo.usageDate || order.usageInfo.usageEventName) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              使用日時
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {order.usageInfo.usageEventName && (
                <div>
                  <span className="text-muted-foreground">イベント名</span>
                  <p className="mt-0.5 font-medium">{order.usageInfo.usageEventName}</p>
                </div>
              )}
              {order.usageInfo.usageDate && (
                <div>
                  <span className="text-muted-foreground">使用日</span>
                  <p className="mt-0.5 font-medium">
                    {parseDateStr(order.usageInfo.usageDate).toLocaleDateString('ja-JP')}
                    {order.usageInfo.usageTimeText && ` ${order.usageInfo.usageTimeText}`}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {order.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              備考
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>注文日: {new Date(order.createdAt).toLocaleString('ja-JP')}</span>
            <span>最終更新: {new Date(order.updatedAt).toLocaleString('ja-JP')}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Link href="/account">
          <Button variant="outline" className="border-brand-teal text-brand-teal hover:bg-brand-teal/5">
            <ArrowLeft className="mr-2 h-4 w-4" />
            マイページに戻る
          </Button>
        </Link>
        <Link href="/products">
          <Button className="bg-brand-dark hover:bg-brand-dark/90">買い物を続ける</Button>
        </Link>
      </div>
    </div>
  )
}
