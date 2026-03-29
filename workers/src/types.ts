export interface Env {
  MEDIA_BUCKET: R2Bucket
  RATE_LIMIT_KV: KVNamespace
  ORIGIN_URL: string
  ALLOWED_ORIGINS: string
  CACHE_PURGE_SECRET: string
}

export interface RateLimitRule {
  limit: number
  windowSec: number
}
