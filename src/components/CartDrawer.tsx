'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { create } from 'zustand'

// Cart drawer state (global open/close)
type CartDrawerStore = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useCartDrawer = create<CartDrawerStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))

export function CartDrawer() {
  const { isOpen, close } = useCartDrawer()
  const items = useCartStore((s) => s.items)
  const removeItem = useCartStore((s) => s.removeItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getItemCount = useCartStore((s) => s.getItemCount)

  const itemCount = getItemCount()
  const subtotal = getSubtotal()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-left text-base font-bold text-brand-dark">
            <ShoppingBag className="h-5 w-5" />
            カート
            {itemCount > 0 && (
              <span className="rounded-full bg-brand-pink px-2 py-0.5 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">カートは空です</p>
              <p className="mt-1 text-xs text-muted-foreground">
                商品を追加してみてください
              </p>
            </div>
            <Link href="/products" onClick={close}>
              <Button variant="outline" size="sm" className="gap-1.5">
                商品を見る
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 px-5 py-4">
                    {/* Product image */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          width={80}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          🎈
                        </div>
                      )}
                    </div>

                    {/* Item info */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/products/${item.productSlug}`}
                          className="text-sm font-medium leading-tight text-foreground hover:underline line-clamp-2"
                          onClick={close}
                        >
                          {item.title}
                        </Link>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex-shrink-0 rounded-md p-1 text-foreground/30 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Options summary */}
                      {(item.options.selections?.length || item.options.extras?.length) ? (
                        <div className="mt-1 space-y-0.5">
                          {item.options.selections?.map((sel, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground">
                              {sel.name}: {sel.value}
                              {sel.additionalPrice ? ` (+¥${sel.additionalPrice.toLocaleString()})` : ''}
                            </p>
                          ))}
                          {item.options.extras?.map((ext, i) => (
                            <p key={`ext-${i}`} className="text-[11px] text-muted-foreground">
                              {ext.name} (+¥{ext.price.toLocaleString()})
                            </p>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center rounded-md border">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="flex h-7 w-7 items-center justify-center text-foreground/50 transition-colors hover:text-foreground disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="flex h-7 w-8 items-center justify-center text-xs font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center text-foreground/50 transition-colors hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <p className="text-sm font-bold text-brand-dark">
                          ¥{(item.unitPrice * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-muted/30 px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-foreground/60">小計</span>
                <span className="text-lg font-bold text-brand-dark">
                  ¥{subtotal.toLocaleString()}
                </span>
              </div>
              <p className="mb-4 text-[11px] text-muted-foreground">
                送料・ポイント利用はチェックアウト時に計算されます
              </p>
              <div className="space-y-2">
                <Link href="/checkout" onClick={close} className="block">
                  <Button className="w-full gap-2 bg-brand-dark font-semibold hover:bg-brand-dark/90">
                    チェックアウトへ進む
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/cart" onClick={close} className="block">
                  <Button variant="ghost" className="w-full text-sm text-foreground/60">
                    カートを見る
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
