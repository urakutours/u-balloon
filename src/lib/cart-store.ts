'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItemOption = {
  selections?: { name: string; value: string; additionalPrice?: number }[]
  textValues?: { name: string; value: string; price?: number }[]
}

export type CartItem = {
  id: string // unique cart item id
  productId: string
  productSlug: string
  title: string
  price: number // base price
  productType: 'standard' | 'delivery'
  imageUrl?: string
  quantity: number
  options: CartItemOption
  optionTotal: number // sum of selected option prices
  unitPrice: number // price + optionTotal
}

type CartStore = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
  getProductType: () => 'standard' | 'delivery' | 'mixed' | null
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const id = `${item.productId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        set((state) => ({
          items: [...state.items, { ...item, id }],
        }))
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }))
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item,
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        )
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      getProductType: () => {
        const items = get().items
        if (items.length === 0) return null
        const types = new Set(items.map((i) => i.productType))
        if (types.size > 1) return 'mixed'
        return items[0].productType
      },
    }),
    {
      name: 'uballoon-cart',
    },
  ),
)
