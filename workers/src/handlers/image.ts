import type { Env } from '../types'

const CACHE_TTL = 60 * 60 * 24 * 30 // 30 days
const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
}

export async function handleImage(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  // Extract filename from /media/{filename}
  const filename = path.replace(/^\/media\//, '')
  if (!filename) {
    return new Response('Not Found', { status: 404 })
  }

  // Check edge cache first
  const cache = caches.default
  const cacheKey = new Request(request.url, request)
  const cached = await cache.match(cacheKey)
  if (cached) {
    return cached
  }

  // Fetch from R2
  const object = await env.MEDIA_BUCKET.get(filename)
  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  // Determine content type
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const contentType =
    object.httpMetadata?.contentType || CONTENT_TYPES[ext] || 'application/octet-stream'

  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': `public, max-age=${CACHE_TTL}, immutable`,
    ETag: object.httpEtag,
  })

  const response = new Response(object.body, { headers })

  // Store in edge cache (non-blocking)
  request.method === 'GET' && cache.put(cacheKey, response.clone())

  return response
}
