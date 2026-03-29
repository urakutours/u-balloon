import type { Env } from '../types'
import { getCorsHeaders } from '../utils/cors'

// TTL in seconds per API path prefix
const CACHE_RULES: { prefix: string; ttl: number }[] = [
  { prefix: '/api/feed/google-merchant', ttl: 3600 },
  { prefix: '/api/available-dates', ttl: 300 },
  { prefix: '/api/option-products', ttl: 120 },
  { prefix: '/api/products', ttl: 60 },
  { prefix: '/api/search', ttl: 30 },
]

function getCacheTtl(path: string): number | null {
  for (const rule of CACHE_RULES) {
    if (path.startsWith(rule.prefix)) return rule.ttl
  }
  return null
}

export async function handleApiCache(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return proxyToOrigin(request, env, path)
  }

  const ttl = getCacheTtl(path)
  if (ttl === null) {
    return proxyToOrigin(request, env, path)
  }

  // Check edge cache
  const cache = caches.default
  const cacheKey = new Request(request.url, request)
  const cached = await cache.match(cacheKey)
  if (cached) {
    const resp = new Response(cached.body, cached)
    resp.headers.set('X-Cache', 'HIT')
    return resp
  }

  // Fetch from origin
  const response = await proxyToOrigin(request, env, path)
  if (!response.ok) return response

  // Cache successful responses
  const cloned = response.clone()
  const cachedResponse = new Response(cloned.body, cloned)
  cachedResponse.headers.set('Cache-Control', `public, max-age=${ttl}, s-maxage=${ttl}`)
  cachedResponse.headers.set('X-Cache', 'MISS')
  cachedResponse.headers.delete('Set-Cookie')

  cache.put(cacheKey, cachedResponse.clone())

  return cachedResponse
}

export async function handleCachePurge(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const authHeader = request.headers.get('Authorization')
  if (!env.CACHE_PURGE_SECRET || authHeader !== `Bearer ${env.CACHE_PURGE_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = (await request.json()) as { paths?: string[] }
  const paths = body.paths || []
  const cache = caches.default
  const baseUrl = new URL(request.url).origin
  let purged = 0

  for (const path of paths) {
    const key = new Request(`${baseUrl}${path}`)
    const deleted = await cache.delete(key)
    if (deleted) purged++
  }

  return Response.json({ purged, total: paths.length })
}

async function proxyToOrigin(request: Request, env: Env, path: string): Promise<Response> {
  const originUrl = new URL(path, env.ORIGIN_URL)
  originUrl.search = new URL(request.url).search

  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-Host', new URL(request.url).host)

  const response = await fetch(originUrl.toString(), {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })

  // Add CORS headers
  const corsHeaders = getCorsHeaders(request, env)
  const resp = new Response(response.body, response)
  for (const [key, value] of Object.entries(corsHeaders)) {
    resp.headers.set(key, value)
  }

  return resp
}
