'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/lib/cart-store'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore()
  const subtotal = getSubtotal()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-pink/20">
          <ShoppingCart className="h-10 w-10 text-brand-pink" />
        </div>
        <h1 className="mb-2 text-xl font-bold text-brand-teal sm:text-2xl">カートは空です</h1>
        <p className="mb-6 text-sm text-muted-foreground sm:text-base">商品を追加してください</p>
        <Link href="/products">
          <Button className="bg-brand-dark hover:bg-brand-dark/90 text-white">商品一覧へ</Button>
        </Link>
      </div>
    )
  }

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?redirect=/checkout')
    } else {
      router.push('/checkout')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">ホーム</Link>
        <span className="mx-2">&gt;</span>
        <span>カート</span>
      </nav>

      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h1 className="text-xl font-bold text-brand-teal sm:text-2xl">ショッピングカート</h1>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-muted-foreground sm:text-sm">
          <Trash2 className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          空にする
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                {/* Thumbnail */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-20">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xl sm:text-2xl">🎈</div>
                  )}
                </div>
                {/* Details */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="text-sm font-semibold leading-tight hover:underline sm:text-base"
                      >
                        <span className="line-clamp-2">{item.title}</span>
                      </Link>
                      {/* Selected Options */}
                      <div className="mt-0.5 space-y-0.5 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
                        {item.options.selections?.map((sel, i) => (
                          <div key={i} className="truncate">
                            {sel.name}: {sel.value}
                            {(sel.additionalPrice ?? 0) > 0 && ` (+¥${sel.additionalPrice!.toLocaleString()})`}
                          </div>
                        ))}
                        {item.options.textValues?.map((tv, i) => (
                          <div key={i} className="truncate">
                            {tv.name}: {tv.value}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive sm:h-8 sm:w-8"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  {/* Quantity + Price */}
                  <div className="mt-auto flex items-center justify-between pt-1.5 sm:pt-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-7 text-center text-sm font-medium sm:w-8">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold sm:text-base">
                      ¥{(item.unitPrice * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary - Sticky on desktop, bottom bar on mobile */}
        <div className="hidden lg:block">
          <Card className="sticky top-20 overflow-hidden">
            <div className="h-1 bg-brand-teal" />
            <CardContent className="p-4">
              <h2 className="mb-4 font-semibold text-brand-dark">注文サマリー</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">商品小計</span>
                <span>¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">送料</span>
                <span className="text-xs text-muted-foreground">チェックアウトで計算</span>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center justify-between font-bold">
                <span>小計</span>
                <span className="text-lg">¥{subtotal.toLocaleString()}</span>
              </div>
              <Button className="mt-4 w-full bg-brand-dark hover:bg-brand-dark/90 text-white" size="lg" onClick={handleCheckout}>
                {user ? 'チェックアウトへ進む' : 'ログインして購入'}
              </Button>
              <Link
                href="/products"
                className="mt-2 block text-center text-xs text-muted-foreground hover:underline"
              >
                買い物を続ける
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile bottom sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-pink-light bg-white p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex-1">
            <span className="text-xs text-muted-foreground">小計</span>
            <p className="text-lg font-bold leading-tight">¥{subtotal.toLocaleString()}</p>
          </div>
          <Button size="lg" className="shrink-0 px-6 bg-brand-dark hover:bg-brand-dark/90 text-white" onClick={handleCheckout}>
            {user ? 'チェックアウト' : 'ログインして購入'}
          </Button>
        </div>
      </div>
      {/* Spacer for mobile bottom bar */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
