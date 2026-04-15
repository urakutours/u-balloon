'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useCartStore } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Truck, ChevronDown, ChevronUp, Coins, CreditCard, Building2, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SenderBlock, type SenderState } from '@/components/checkout/SenderBlock'
import { RecipientBlock, type RecipientState } from '@/components/checkout/RecipientBlock'
import { GiftBlock, type GiftState } from '@/components/checkout/GiftBlock'
import { UsageDateBlock, type UsageInfo } from '@/components/checkout/UsageDateBlock'
import type { GiftWrappingOption, MessageCardTemplate, ShippingTimeSlot } from '@/lib/site-settings'

type PlanOption = {
  planId: string
  planName: string
  carrier: string
  estimatedDaysMin: number | null
  estimatedDaysMax: number | null
  shippingFee: number
  eligible: boolean
  reason: string | null
  breakdown: Record<string, unknown>
  scheduledShipDate: string | null
  availableTimeSlots?: ShippingTimeSlot[]
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { items, getSubtotal, clearCart } = useCartStore()
  const subtotal = getSubtotal()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  // カートが空なら /cart へリダイレクト
  useEffect(() => {
    if (hydrated && items.length === 0) router.push('/cart')
  }, [hydrated, items.length, router])

  const isGuest = !user

  // --- Sender state ---
  const [sender, setSender] = useState<SenderState>({
    name: '',
    nameKana: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    addressLine1: '',
    addressLine2: '',
  })

  // --- Recipient state ---
  const [recipient, setRecipient] = useState<RecipientState>({
    sameAsSender: true,
    name: '',
    nameKana: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    addressLine1: '',
    addressLine2: '',
    desiredArrivalDate: '',
    desiredTimeSlotValue: '',
    desiredTimeSlotLabel: '',
  })

  // --- Gift state ---
  const [gift, setGift] = useState<GiftState>({
    wrappingOptionId: '',
    wrappingOptionName: '',
    wrappingFee: 0,
    messageCardTemplateId: '',
    messageCardText: '',
  })

  // --- UsageInfo state ---
  const [usageInfo, setUsageInfo] = useState<UsageInfo>({
    eventName: '',
    usageDate: '',
    usageTimeText: '',
  })

  // --- Gift settings from API ---
  const [giftWrappingOptions, setGiftWrappingOptions] = useState<GiftWrappingOption[]>([])
  const [giftMessageCardTemplates, setGiftMessageCardTemplates] = useState<MessageCardTemplate[]>([])

  // --- Notes & payment ---
  const [notes, setNotes] = useState('')
  const [pointsToUse, setPointsToUse] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bank_transfer'>('stripe')
  const [submitting, setSubmitting] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  // --- Shipping state ---
  const [shippingCalculating, setShippingCalculating] = useState(false)
  const [shippingResult, setShippingResult] = useState<{
    distanceKm: number
    shippingFee: number
    breakdown: string
  } | null>(null)
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [scheduledShipDate, setScheduledShipDate] = useState<string | null>(null)

  // ログイン時: sender を user 情報でプリセット
  useEffect(() => {
    if (user) {
      setSender({
        name: user.name ?? '',
        nameKana: (user as any).nameKana ?? '',
        email: user.email ?? '',
        phone: (user as any).phone ?? (user as any).mobilePhone ?? '',
        postalCode: (user as any).postalCode ?? '',
        prefecture: (user as any).prefecture ?? '',
        addressLine1: (user as any).addressLine1 ?? '',
        addressLine2: (user as any).addressLine2 ?? '',
      })
    }
  }, [user])

  // ギフト設定を API から取得
  useEffect(() => {
    const fetchGiftSettings = async () => {
      try {
        const res = await fetch('/api/gift-settings')
        if (res.ok) {
          const data = await res.json()
          setGiftWrappingOptions(data.wrappingOptions ?? [])
          setGiftMessageCardTemplates(data.messageCardTemplates ?? [])
        }
      } catch (err) {
        console.error('Failed to fetch gift settings:', err)
      }
    }
    fetchGiftSettings()
  }, [])

  const cartProductType = (() => {
    const types = new Set(items.map((i) => i.productType))
    if (types.has('delivery')) return 'delivery'
    return 'standard'
  })()

  // 配送先住所（送り先別指定 or 送り主と同じ）
  const destinationAddress = recipient.sameAsSender
    ? `${sender.prefecture}${sender.addressLine1}${sender.addressLine2}`
    : `${recipient.prefecture}${recipient.addressLine1}${recipient.addressLine2}`

  const calculateShipping = useCallback(async () => {
    if (!destinationAddress.trim()) return
    setShippingCalculating(true)
    try {
      const res = await fetch('/api/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationAddress,
          cartSubtotal: subtotal,
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.plans) {
        let plans = data.plans as PlanOption[]
        if (cartProductType === 'delivery') {
          plans = plans.filter((p) => p.carrier === 'self_delivery')
        }
        setPlanOptions(plans)
        const firstEligible = plans.find((p) => p.eligible)
        if (firstEligible) {
          setSelectedPlanId(firstEligible.planId)
          setShippingResult({
            distanceKm: data.distanceKm ?? 0,
            shippingFee: firstEligible.shippingFee,
            breakdown: String(firstEligible.breakdown?.summary ?? ''),
          })
          setScheduledShipDate(firstEligible.scheduledShipDate ?? null)
        } else {
          setScheduledShipDate(null)
        }
      }
    } catch (err) {
      console.error('Failed to calculate shipping:', err)
    } finally {
      setShippingCalculating(false)
    }
  }, [destinationAddress, cartProductType, subtotal])

  const selectedPlan = planOptions.find((p) => p.planId === selectedPlanId)
  const shippingFee = selectedPlan?.shippingFee ?? shippingResult?.shippingFee ?? 0
  const wrappingFee = gift.wrappingFee ?? 0
  const maxUsablePoints = Math.min(user?.points ?? 0, subtotal + shippingFee + wrappingFee)
  const pointsDiscount = Math.min(pointsToUse, maxUsablePoints)
  const totalAmount = subtotal + shippingFee + wrappingFee - pointsDiscount

  const hasIneligibleOnly = planOptions.length > 0 && planOptions.every((p) => !p.eligible)
  const hasNoDeliveryPlan =
    cartProductType === 'delivery' &&
    shippingResult !== null &&
    planOptions.filter((p) => p.carrier === 'self_delivery').length === 0

  // availableTimeSlots: 選択中プランのものを渡す（未選択は空配列）
  const availableTimeSlots: ShippingTimeSlot[] = selectedPlan?.availableTimeSlots ?? []

  // バリデーション
  const isGuestInvalid = isGuest && (!sender.name || !sender.email || !sender.phone)
  const isRecipientInvalid =
    !recipient.sameAsSender && (!recipient.prefecture || !recipient.addressLine1)
  const isSubmitDisabled =
    submitting ||
    !selectedPlanId ||
    hasIneligibleOnly ||
    hasNoDeliveryPlan ||
    isGuestInvalid ||
    isRecipientInvalid

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const checkoutItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedOptions: item.options,
        unitPrice: item.unitPrice,
      }))

      const resolvedRecipient = {
        ...recipient,
        ...(recipient.sameAsSender
          ? {
              name: sender.name,
              nameKana: sender.nameKana,
              phone: sender.phone,
              postalCode: sender.postalCode,
              prefecture: sender.prefecture,
              addressLine1: sender.addressLine1,
              addressLine2: sender.addressLine2,
            }
          : {}),
      }

      const commonBody = {
        items: checkoutItems,
        subtotal,
        shippingFee,
        pointsUsed: pointsDiscount,
        notes: notes || undefined,
        shippingPlanId: selectedPlan?.planId,
        shippingPlanName: selectedPlan?.planName,
        scheduledShipDate: scheduledShipDate ?? undefined,
        sender,
        recipient: resolvedRecipient,
        giftSettings: gift,
        usageInfo,
        isGuestOrder: !user,
        // 後方互換のための旧フィールド（API側で使用）
        deliveryAddress: recipient.sameAsSender
          ? `${sender.prefecture}${sender.addressLine1} ${sender.addressLine2}`
          : `${recipient.prefecture}${recipient.addressLine1} ${recipient.addressLine2}`,
        desiredArrivalDate: recipient.desiredArrivalDate || undefined,
        desiredTimeSlot: recipient.desiredTimeSlotValue || undefined,
        eventName: usageInfo.eventName || undefined,
        eventDateTime: usageInfo.usageDate
          ? `${usageInfo.usageDate}T${usageInfo.usageTimeText || '00:00'}`
          : undefined,
        deliveryDistance: shippingResult?.distanceKm ?? 0,
      }

      if (paymentMethod === 'stripe') {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(commonBody),
        })
        const data = await res.json()
        if (res.ok && data.url) {
          clearCart()
          window.location.href = data.url
        } else {
          alert(data.error || '注文の作成に失敗しました')
        }
      } else {
        // 銀行振込
        const res = await fetch('/api/create-bank-transfer-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...commonBody,
            customerId: user?.id,
            totalAmount,
          }),
        })
        const data = await res.json()
        if (res.ok && data.orderId) {
          clearCart()
          window.location.href = `/order-complete?order_id=${data.orderId}`
        } else if (res.status === 503) {
          alert('現在銀行振込は利用できません。クレジットカード決済をご利用ください。')
        } else {
          alert(data.error || '注文の作成に失敗しました')
        }
      }
    } catch {
      alert('注文の作成中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  // authLoading 中 or カート空（hydrate 前）はスピナー表示
  if (!hydrated || (authLoading && !user)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-brand-teal sm:mb-8 sm:text-3xl">
        チェックアウト
      </h1>

      {/* Mobile: Collapsible order summary */}
      <div className="mb-4 lg:hidden">
        <div className="rounded-xl border border-border/60 bg-white">
          <button
            className="flex w-full items-center justify-between p-4"
            onClick={() => setSummaryOpen(!summaryOpen)}
          >
            <span className="text-sm font-semibold text-brand-dark">
              ご注文内容 ({items.length}点)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-brand-dark">¥{totalAmount.toLocaleString()}</span>
              {summaryOpen ? <ChevronUp className="h-4 w-4 text-foreground/40" /> : <ChevronDown className="h-4 w-4 text-foreground/40" />}
            </div>
          </button>
          {summaryOpen && (
            <div className="border-t border-border/60 px-4 pb-4 pt-3">
              <div className="space-y-1.5 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-foreground/60 line-clamp-1 pr-2">{item.title} × {item.quantity}</span>
                    <span className="shrink-0 font-medium">¥{(item.unitPrice * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">商品小計</span>
                  <span>¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60">送料</span>
                  <span>{shippingResult ? `¥${shippingFee.toLocaleString()}` : '未計算'}</span>
                </div>
                {wrappingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-foreground/60">ラッピング</span>
                    <span>¥{wrappingFee.toLocaleString()}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-brand-teal">
                    <span>ポイント使用</span>
                    <span>-¥{pointsDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-5 lg:col-span-2">

          {/* 1. ゲスト向けログイン誘導バナー */}
          {isGuest && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-4">
              <LogIn className="h-5 w-5 shrink-0 text-brand-teal" />
              <p className="text-sm text-brand-dark">
                会員の方はログインすると送り主情報の入力が不要です。
                <Link
                  href={`/login?redirect=/checkout`}
                  className="ml-1 font-semibold text-brand-teal underline underline-offset-2"
                >
                  ログインする
                </Link>
              </p>
            </div>
          )}

          {/* 2. SenderBlock — 送り主情報 */}
          <SenderBlock
            value={sender}
            onChange={setSender}
            user={user}
            isGuest={isGuest}
          />

          {/* 3. RecipientBlock — 送り先情報 */}
          <RecipientBlock
            value={recipient}
            onChange={setRecipient}
            senderSnapshot={sender}
            availableTimeSlots={availableTimeSlots}
          />

          {/* 4. 配送プラン選択 */}
          <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              <Truck className="h-4.5 w-4.5 text-brand-teal" />
              配送プラン
            </h2>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={() => calculateShipping()}
                disabled={!destinationAddress.trim() || shippingCalculating}
              >
                {shippingCalculating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> 計算中...</>
                ) : (
                  <><Truck className="h-4 w-4" /> 送料を計算</>
                )}
              </Button>
              {planOptions.length > 0 && (
                <div className="mt-3 space-y-3">
                  {planOptions.map((p) => (
                    <label
                      key={p.planId}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                        selectedPlanId === p.planId
                          ? 'border-brand-teal bg-brand-teal/5'
                          : 'border-border hover:border-brand-teal/40',
                        !p.eligible && 'cursor-not-allowed opacity-50',
                      )}
                    >
                      <input
                        type="radio"
                        name="shippingPlan"
                        value={p.planId}
                        checked={selectedPlanId === p.planId}
                        disabled={!p.eligible}
                        onChange={() => {
                          if (p.eligible) {
                            setSelectedPlanId(p.planId)
                            setShippingResult((prev) =>
                              prev ? { ...prev, shippingFee: p.shippingFee } : null,
                            )
                            setScheduledShipDate(p.scheduledShipDate ?? null)
                          }
                        }}
                        className="mt-1 accent-brand-teal"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-brand-dark">{p.planName}</span>
                          <span className="font-semibold text-brand-dark">¥{p.shippingFee.toLocaleString()}</span>
                        </div>
                        {(p.estimatedDaysMin != null || p.estimatedDaysMax != null) && (
                          <div className="mt-1 text-sm text-foreground/60">
                            発送から{p.estimatedDaysMin ?? '-'}〜{p.estimatedDaysMax ?? '-'}日で到着予定
                          </div>
                        )}
                        {p.reason && (
                          <div className="mt-1 text-sm text-destructive">{p.reason}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 5. UsageDateBlock — 使用日時 */}
          <UsageDateBlock value={usageInfo} onChange={setUsageInfo} />

          {/* 6. GiftBlock — ギフト設定 */}
          <GiftBlock
            value={gift}
            onChange={setGift}
            wrappingOptions={giftWrappingOptions}
            messageCardTemplates={giftMessageCardTemplates}
          />

          {/* 7. お支払い方法 */}
          <section aria-labelledby="payment-method-heading" className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 id="payment-method-heading" className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              <CreditCard className="h-4.5 w-4.5 text-brand-teal" />
              お支払い方法
            </h2>
            <div className="space-y-3">
              <label className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                paymentMethod === 'stripe'
                  ? 'border-brand-teal bg-brand-teal/5'
                  : 'border-border hover:border-brand-teal/40',
              )}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                  className="mt-1 accent-brand-teal"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-brand-teal" />
                    <span className="font-semibold text-brand-dark">クレジットカード</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">
                    主要ブランド対応。即時決済で安心してお買い物いただけます。
                  </p>
                </div>
              </label>
              <label className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                paymentMethod === 'bank_transfer'
                  ? 'border-brand-teal bg-brand-teal/5'
                  : 'border-border hover:border-brand-teal/40',
              )}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={() => setPaymentMethod('bank_transfer')}
                  className="mt-1 accent-brand-teal"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-brand-teal" />
                    <span className="font-semibold text-brand-dark">銀行振込（前払い）</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/60">
                    ご注文確定後、お振込先をメールでお知らせいたします。期限までにお振込みください。
                  </p>
                </div>
              </label>
            </div>
          </section>

          {/* 8. ポイント使用 — ログイン時のみ */}
          {user && (
            <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
                <Coins className="h-4.5 w-4.5 text-brand-teal" />
                ポイント使用
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-foreground/60">保有ポイント:</span>
                <Badge variant="secondary" className="gap-1 bg-brand-pink-light text-brand-pink">
                  {(user.points ?? 0).toLocaleString()} pt
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={maxUsablePoints}
                  value={pointsToUse}
                  onChange={(e) =>
                    setPointsToUse(Math.max(0, Math.min(maxUsablePoints, Number(e.target.value) || 0)))
                  }
                  className="w-24 text-base sm:w-32 sm:text-sm"
                />
                <span className="text-sm text-foreground/60">pt</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={() => setPointsToUse(maxUsablePoints)}
                  disabled={maxUsablePoints === 0}
                >
                  全て使う
                </Button>
              </div>
              {pointsDiscount > 0 && (
                <p className="mt-2 text-sm font-medium text-brand-teal">
                  -{pointsDiscount.toLocaleString()}円割引が適用されます
                </p>
              )}
            </section>
          )}

          {/* 9. 備考 */}
          <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              備考
            </h2>
            <Textarea
              placeholder="ご要望などがあればご記入ください..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-base sm:text-sm"
            />
          </section>
        </div>

        {/* 10. 注文サマリー + 決済ボタン — Desktop Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border border-border/60 bg-white p-6">
            <h2 className="mb-4 font-bold text-brand-dark">ご注文内容</h2>
            <div className="space-y-2 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-foreground/60 line-clamp-1">{item.title} × {item.quantity}</span>
                  <span className="font-medium">¥{(item.unitPrice * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">商品小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">送料</span>
                <span>
                  {selectedPlan
                    ? `¥${shippingFee.toLocaleString()}`
                    : shippingResult
                      ? `¥${shippingFee.toLocaleString()}`
                      : '未計算'}
                </span>
              </div>
              {wrappingFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground/60">ラッピング</span>
                  <span>¥{wrappingFee.toLocaleString()}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-brand-teal">
                  <span>ポイント使用</span>
                  <span>-¥{pointsDiscount.toLocaleString()}</span>
                </div>
              )}
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-lg font-bold text-brand-dark">
              <span>合計</span>
              <span>¥{totalAmount.toLocaleString()}</span>
            </div>
            <span
              className="mt-6 block w-full"
              title={isGuestInvalid ? '必須項目（送り主情報）を入力してください' : undefined}
            >
              <Button
                className="w-full gap-2 bg-brand-dark font-semibold hover:bg-brand-dark/90"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> 処理中...</>
                  : paymentMethod === 'bank_transfer'
                    ? '注文を確定する（銀行振込）'
                    : '決済へ進む'}
              </Button>
            </span>
            {hasNoDeliveryPlan && (
              <p className="mt-2 text-center text-xs text-destructive">
                このカート内容では対応するデリバリー便がありません。住所または商品構成をご確認ください。
              </p>
            )}
            {hasIneligibleOnly && (
              <p className="mt-2 text-center text-xs text-destructive">
                お届け先エリアに対応する配送プランがありません。住所をご確認ください。
              </p>
            )}
            {!selectedPlanId && !hasIneligibleOnly && !hasNoDeliveryPlan && (
              <p className="mt-2 text-center text-xs text-foreground/40">
                配送プランを選択すると決済に進めます。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-white/95 p-3 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-foreground/60">合計</span>
            <span className="text-lg font-bold text-brand-dark">¥{totalAmount.toLocaleString()}</span>
          </div>
          <span
            className="block w-full"
            title={isGuestInvalid ? '必須項目（送り主情報）を入力してください' : undefined}
          >
            <Button
              className="w-full gap-2 bg-brand-dark font-semibold hover:bg-brand-dark/90"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> 処理中...</>
              ) : hasNoDeliveryPlan ? (
                'デリバリー便がありません'
              ) : hasIneligibleOnly ? (
                '対応エリア外のため注文できません'
              ) : !selectedPlanId ? (
                '配送プランを選択してください'
              ) : isGuestInvalid ? (
                '送り主情報を入力してください'
              ) : paymentMethod === 'bank_transfer' ? (
                '注文を確定する（銀行振込）'
              ) : (
                '決済へ進む'
              )}
            </Button>
          </span>
        </div>
      </div>
      <div className="h-24 lg:hidden" />
    </div>
  )
}
