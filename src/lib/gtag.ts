// Build-time env var (fallback). Primary source is window.GA4_MEASUREMENT_ID
// set by GoogleAnalytics component from DB (SiteSettings.ga4MeasurementId).
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || ''

function getGa4Id(): string {
  if (typeof window !== 'undefined') {
    const id = (window as Window & { GA4_MEASUREMENT_ID?: string }).GA4_MEASUREMENT_ID
    if (id) return id
  }
  return GA_MEASUREMENT_ID
}

export const isGaEnabled = () => !!getGa4Id()

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
  const id = getGa4Id()
  if (!id) return
  window.gtag('config', id, { page_path: url })
}

// https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
type GtagEvent = {
  action: string
  params: Record<string, unknown>
}

export const event = ({ action, params }: GtagEvent) => {
  if (!getGa4Id()) return
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
