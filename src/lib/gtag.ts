export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || ''

export const isGaEnabled = () => !!GA_MEASUREMENT_ID

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  if (!isGaEnabled()) return
  window.gtag('config', GA_MEASUREMENT_ID, { page_path: url })
}

// https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
type GtagEvent = {
  action: string
  params: Record<string, unknown>
}

export const event = ({ action, params }: GtagEvent) => {
  if (!isGaEnabled()) return
  window.gtag('event', action, params)
}

// --- Ecommerce helper events ---

type EcomItem = {
  item_id: string
  item_name: string
  price: number
  quantity?: number
  item_category?: string
}

export const viewItem = (item: EcomItem) => {
  event({
    action: 'view_item',
    params: {
      currency: 'JPY',
      value: item.price,
      items: [item],
    },
  })
}

export const addToCart = (item: EcomItem) => {
  event({
    action: 'add_to_cart',
    params: {
      currency: 'JPY',
      value: item.price * (item.quantity || 1),
      items: [item],
    },
  })
}

export const removeFromCart = (item: EcomItem) => {
  event({
    action: 'remove_from_cart',
    params: {
      currency: 'JPY',
      value: item.price * (item.quantity || 1),
      items: [item],
    },
  })
}

export const beginCheckout = (items: EcomItem[], value: number) => {
  event({
    action: 'begin_checkout',
    params: {
      currency: 'JPY',
      value,
      items,
    },
  })
}

export const purchase = (transactionId: string, items: EcomItem[], value: number, shipping: number) => {
  event({
    action: 'purchase',
    params: {
      transaction_id: transactionId,
      currency: 'JPY',
      value,
      shipping,
      items,
    },
  })
}
