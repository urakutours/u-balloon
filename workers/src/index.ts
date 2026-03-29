import type { Env } from './types'
import { handleImage } from './handlers/image'
import { handleApiCache, handleCachePurge } from './handlers/edge-cache'
import { checkRateLimit } from './handlers/rate-limiter'
import { handleOptions, getCorsHeaders } from './utils/cors'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env)
    }

    // Route: Image serving from R2
    if (path.startsWith('/media/')) {
      return handleImage(request, env, path)
    }

    // Route: Cache purge
    if (path === '/__purge') {
      return handleCachePurge(request, env)
    }

    // Route: API requests — rate limit then cache/proxy
    if (path.startsWith('/api/')) {
      // Check rate limit first
      const blocked = await checkRateLimit(request, env, path)
      if (blocked) {
        const corsHeaders = getCorsHeaders(request, env)
        for (const [key, value] of Object.entries(corsHeaders)) {
          blocked.headers.set(key, value)
        }
        return blocked
      }

      // Edge cache for GET, proxy for everything else
      return handleApiCache(request, env, path)
    }

    // All other requests: proxy to origin
    const originUrl = new URL(path, env.ORIGIN_URL)
    originUrl.search = url.search
    return fetch(originUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    })
  },
} satisfies ExportedHandler<Env>
