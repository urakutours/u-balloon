import type { Env } from '../types'

export function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())

  if (!allowed.includes(origin)) {
    return {}
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

export function handleOptions(request: Request, env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, env),
  })
}
