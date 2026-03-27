'use client'

import { useState, useEffect } from 'react'
import { event as gaEvent } from './gtag'

type ABVariant = {
  variantId: string
  heroImage?: { url: string; alt: string }
  headingOverride?: string
  descriptionOverride?: string
  ctaText?: string
}

type ABTestResult = {
  testId: string | null
  variant: ABVariant | null
  loading: boolean
  recordConversion: () => void
}

export function useABTest(productId: string): ABTestResult {
  const [testId, setTestId] = useState<string | null>(null)
  const [variant, setVariant] = useState<ABVariant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check sessionStorage for sticky assignment
    const storageKey = `ab_${productId}`
    const cached = sessionStorage.getItem(storageKey)

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setTestId(parsed.testId)
        setVariant(parsed.variant)
        setLoading(false)
        return
      } catch {
        sessionStorage.removeItem(storageKey)
      }
    }

    fetch(`/api/ab-test?productId=${productId}`)
      .then((res) => res.json())
      .then((data) => {
        setTestId(data.testId || null)
        setVariant(data.variant || null)

        // Persist assignment in session
        if (data.testId && data.variant) {
          sessionStorage.setItem(storageKey, JSON.stringify(data))

          // Track GA4 event
          gaEvent({
            action: 'ab_test_impression',
            params: {
              test_id: data.testId,
              variant_id: data.variant.variantId,
              product_id: productId,
            },
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [productId])

  const recordConversion = () => {
    if (!testId || !variant) return

    fetch('/api/ab-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId, variantId: variant.variantId }),
    }).catch(console.error)

    gaEvent({
      action: 'ab_test_conversion',
      params: {
        test_id: testId,
        variant_id: variant.variantId,
        product_id: productId,
      },
    })
  }

  return { testId, variant, loading, recordConversion }
}
