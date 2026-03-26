'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCartStore } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Loader2, MapPin, Truck, ChevronDown, ChevronUp, Clock, MessageSquare, Coins, PartyPopper } from 'lucide-react'
import { format, addDays, addMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { items, getSubtotal, clearCart } = useCartStore()
  const subtotal = getSubtotal()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?redirect=/checkout')
  }, [authLoading, user, router])

  useEffect(() => {
    if (hydrated && items.length === 0) router.push('/cart')
  }, [hydrated, items.length, router])

  // Form state
  const [address, setAddress] = useState(user?.defaultAddress || '')
  const [desiredDate, setDesiredDate] = useState<Date | undefined>()
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [timeSlot, setTimeSlot] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDateTime, setEventDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [pointsToUse, setPointsToUse] = useState(0)

  // Shipping state
  const [shippingCalculating, setShippingCalculating] = useState(false)
  const [shippingResult, setShippingResult] = useState<{
    distanceKm: number
    shippingFee: number
    breakdown: string
  } | null>(null)

  // Available dates
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [datesLoading, setDatesLoading] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)

  useEffect(() => {
    if (user?.defaultAddress && !address) setAddress(user.defaultAddress)
  }, [user, address])

  const cartProductType = (() => {
    const types = new Set(items.map((i) => i.productType))
    if (types.has('delivery')) return 'delivery'
    return 'standard'
  })()

  useEffect(() => {
    const fetchDates = async () => {
      setDatesLoading(true)
      try {
        const startDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
        const endDate = format(addMonths(new Date(), 3), 'yyyy-MM-dd')
        const res = await fetch('/api/available-dates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, productType: cartProductType }),
        })
        if (res.ok) {
          const data = await res.json()
          setAvailableDates(new Set(data.availableDates || []))
        }
      } catch (err) {
        console.error('Failed to fetch available dates:', err)
      } finally {
        setDatesLoading(false)
      }
    }
    fetchDates()
  }, [cartProductType])

  const calculateShipping = useCallback(async () => {
    if (!address.trim()) return
    setShippingCalculating(true)
    try {
      const res = await fetch('/api/calculate-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationAddress: address, productType: cartProductType, cartSubtotal: subtotal }),
      })
      if (res.ok) setShippingResult(await res.json())
    } catch (err) {
      console.error('Failed to calculate shipping:', err)
    } finally {
      setShippingCalculating(false)
    }
  }, [address, cartProductType, subtotal])

  const isDateDisabled = (date: Date) => !availableDates.has(format(date, 'yyyy-MM-dd'))

  const maxUsablePoints = Math.min(user?.points ?? 0, subtotal + (shippingResult?.shippingFee ?? 0))
  const pointsDiscount = Math.min(pointsToUse, maxUsablePoints)
  const shippingFee = shippingResult?.shippingFee ?? 0
  const totalAmount = subtotal + shippingFee - pointsDiscount

  const handleSubmit = async () => {
    if (!user) return
    setSubmitting(true)
    try {
      const checkoutItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedOptions: item.options,
        unitPrice: item.unitPrice,
      }))

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items: checkoutItems,
          subtotal,
          shippingFee,
          pointsUsed: pointsDiscount,
          deliveryAddress: address,
          deliveryDistance: shippingResult?.distanceKm ?? 0,
          desiredArrivalDate: desiredDate ? format(desiredDate, 'yyyy-MM-dd') : undefined,
          desiredTimeSlot: timeSlot || undefined,
          eventName: eventName || undefined,
          eventDateTime: eventDateTime || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.url) {
        clearCart()
        window.location.href = data.url
      } else {
        alert(data.error || '注文の作成に失敗しました')
      }
    } catch {
      alert('注文の作成中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user || !hydrated || items.length === 0) {
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

          {/* 1. Delivery Address */}
          <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              <MapPin className="h-4.5 w-4.5 text-brand-teal" />
              配送先住所
            </h2>
            <div className="space-y-3">
              <Input
                placeholder="例: 東京都渋谷区..."
                value={address}
                onChange={(e) => { setAddress(e.target.value); setShippingResult(null) }}
                className="text-base sm:text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={calculateShipping}
                disabled={!address.trim() || shippingCalculating}
              >
                {shippingCalculating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> 計算中...</>
                ) : (
                  <><Truck className="h-4 w-4" /> 送料を計算</>
                )}
              </Button>
              {shippingResult && (
                <div className="rounded-lg bg-brand-pink-light/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/60">距離: {shippingResult.distanceKm}km</span>
                    <span className="font-bold text-brand-dark">送料: ¥{shippingResult.shippingFee.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-foreground/40">{shippingResult.breakdown}</p>
                </div>
              )}
            </div>
          </section>

          {/* 2. Desired Arrival Date */}
          <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              <CalendarIcon className="h-4.5 w-4.5 text-brand-teal" />
              到着希望日
            </h2>
            <div className="space-y-3">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-accent"
                    />
                  }
                >
                  <CalendarIcon className="h-4 w-4 text-foreground/40" />
                  <span className={desiredDate ? 'text-foreground' : 'text-foreground/40'}>
                    {desiredDate
                      ? format(desiredDate, 'yyyy年M月d日(E)', { locale: ja })
                      : '日付を選択...'}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                  {datesLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <Calendar
                      mode="single"
                      selected={desiredDate}
                      onSelect={(date) => { setDesiredDate(date); setDatePickerOpen(false) }}
                      disabled={isDateDisabled}
                      fromDate={addDays(new Date(), 1)}
                      toDate={addMonths(new Date(), 3)}
                      className="rounded-md border-0"
                    />
                  )}
                </PopoverContent>
              </Popover>
              <p className="text-xs text-foreground/40">
                {cartProductType === 'delivery'
                  ? 'デリバリー商品は最短5営業日後からお届け可能です'
                  : '通常商品は最短3営業日後からお届け可能です'}
              </p>
            </div>
          </section>

          {/* 3. Time Slot & Event Info */}
          <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              <Clock className="h-4.5 w-4.5 text-brand-teal" />
              配送時間・イベント情報
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-brand-dark">希望時間帯</Label>
                  <Select value={timeSlot} onValueChange={(v) => setTimeSlot(v || '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="時間帯を選択..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">午前</SelectItem>
                      <SelectItem value="afternoon">午後</SelectItem>
                      <SelectItem value="evening">夕方</SelectItem>
                      <SelectItem value="night">夜</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block text-sm font-semibold text-brand-dark">
                    使用日時（イベント日時）
                  </Label>
                  <Input
                    type="datetime-local"
                    value={eventDateTime}
                    onChange={(e) => setEventDateTime(e.target.value)}
                    className="text-base sm:text-sm"
                  />
                </div>
              </div>

              {/* Event Name — from Shopify's cart-delivery-options */}
              <div>
                <Label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-brand-dark">
                  <PartyPopper className="h-3.5 w-3.5 text-brand-pink" />
                  イベント名（任意）
                </Label>
                <Input
                  placeholder="例: ○○家・△△家 結婚披露宴、○○さん誕生日パーティー"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="text-base sm:text-sm"
                />
                <p className="mt-1.5 text-xs text-foreground/40">
                  結婚式やパーティーの場合、外箱に記載して混乱を防ぎます
                </p>
              </div>
            </div>
          </section>

          {/* 4. Notes */}
          <section className="rounded-xl border border-border/60 bg-white p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-dark sm:text-base">
              <MessageSquare className="h-4.5 w-4.5 text-brand-teal" />
              備考
            </h2>
            <Textarea
              placeholder="ご要望やメッセージカードの文面などがあればご記入ください..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-base sm:text-sm"
            />
          </section>

          {/* 5. Points */}
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
                onChange={(e) => setPointsToUse(Math.max(0, Math.min(maxUsablePoints, Number(e.target.value) || 0)))}
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
        </div>

        {/* Order Summary Sidebar — Desktop */}
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
                <span>{shippingResult ? `¥${shippingFee.toLocaleString()}（${shippingResult.distanceKm}km）` : '未計算'}</span>
              </div>
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
            <Button
              className="mt-6 w-full gap-2 bg-brand-dark font-semibold hover:bg-brand-dark/90"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !shippingResult}
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> 処理中...</> : '決済へ進む'}
            </Button>
            {!shippingResult && (
              <p className="mt-2 text-center text-xs text-foreground/40">
                送料を計算してから決済に進めます
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
          <Button
            className="w-full gap-2 bg-brand-dark font-semibold hover:bg-brand-dark/90"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || !shippingResult}
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> 処理中...</>
            ) : !shippingResult ? (
              '送料を先に計算してください'
            ) : (
              '決済へ進む'
            )}
          </Button>
        </div>
      </div>
      <div className="h-24 lg:hidden" />
    </div>
  )
}
