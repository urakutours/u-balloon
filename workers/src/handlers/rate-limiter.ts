import type { Env, RateLimitRule } from '../types'

// Rate limit rules by endpoint
const RULES: { prefix: string; method?: string; rule: RateLimitRule }[] = [
  { prefix: '/api/create-checkout-session', method: 'POST', rule: { limit: 5, windowSec: 60 } },
  { prefix: '/api/create-bank-transfer-order', method: 'POST', rule: { limit: 5, windowSec: 60 } },
  { prefix: '/api/create-subscription', method: 'POST', rule: { limit: 3, windowSec: 60 } },
  { prefix: '/api/form-submit', method: 'POST', rule: { limit: 3, windowSec: 300 } },
  { prefix: '/api/newsletter/subscribe', method: 'POST', rule: { limit: 3, windowSec: 300 } },
  { prefix: '/api/validate-coupon', method: 'POST', rule: { limit: 10, windowSec: 60 } },
  { prefix: '/api/points/use', method: 'POST', rule: { limit: 5, windowSec: 60 } },
  { prefix: '/api/search', rule: { limit: 30, windowSec: 60 } },
]

// Default rate limit for all /api/* POST requests
const DEFAULT_RULE: RateLimitRule = { limit: 60, windowSec: 60 }

// Stripe webhook IPs should be allowed through
const STRIPE_WEBHOOK_PATH = '/api/webhooks/stripe'

function getRule(path: string, method: string): RateLimitRule | null {
  for (const r of RULES) {
    if (path.startsWith(r.prefix)) {
      if (r.method && r.method !== method) continue
      return r.rule
    }
  }
  // Apply default rate limit only to POST requests
  if (method === 'POST') return DEFAULT_RULE
  return null
}

function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown'
}

export async function checkRateLimit(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  const method = request.method

  // Skip rate limiting for Stripe webhooks with signature
  if (path === STRIPE_WEBHOOK_PATH && request.headers.has('stripe-signature')) {
    return null
  }

  // Block POST requests with no User-Agent (likely bots)
  if (method === 'POST' && !request.headers.get('User-Agent')) {
    return Response.json(
      { error: 'Forbidden' },
      { status: 403 },
    )
  }

  const rule = getRule(path, method)
  if (!rule) return null // No rate limit for this request

  const ip = getClientIp(request)
  const windowId = Math.floor(Date.now() / 1000 / rule.windowSec)
  const key = `rl:${ip}:${path}:${windowId}`

  const current = parseInt((await env.RATE_LIMIT_KV.get(key)) || '0', 10)

  if (current >= rule.limit) {
    const retryAfter = rule.windowSec - (Math.floor(Date.now() / 1000) % rule.windowSec)
    return Response.json(
      { error: 'Rate limit exceeded', retryAfter },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    )
  }

  // Increment counter (non-blocking)
  await env.RATE_LIMIT_KV.put(key, String(current + 1), {
    expirationTtl: rule.windowSec * 2,
  })

  return null // Allowed
}
