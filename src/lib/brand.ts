/**
 * Brand metadata resolver.
 *
 * Reads `brandName` / `brandTagline` / `emailSubjectPrefix` from SiteSettings,
 * with safe fallbacks. Use this from server-side code (RSC, hooks, API routes)
 * to avoid scattering hardcoded shop names across the codebase.
 *
 * Per `feedback_uballoon_domain_naming.md`, the canonical brand string in this
 * codebase is `u-balloon` (hyphenated). The unhyphenated `uballoon` shows up
 * as a casual / package-folder spelling and is intentionally not used as the
 * default here.
 */

import { getSiteSettings } from './site-settings'

export type Brand = {
  /** Brand name shown in email headers, JSON-LD, SEO copy, etc. */
  name: string
  /** Optional marketing tagline used in SEO header copy. May be empty. */
  tagline: string
  /** Prefix for email subjects, e.g. `【u-balloon】`. */
  subjectPrefix: string
  /** Long-form footer line for email layouts, e.g. `u-balloon - バルーンギフトEC`. */
  emailFooterTagline: string
}

const DEFAULT_BRAND_NAME = 'u-balloon'
const DEFAULT_BRAND_TAGLINE = ''
const DEFAULT_EMAIL_FOOTER_TAGLINE = `${DEFAULT_BRAND_NAME} - バルーンギフトEC`

function buildSubjectPrefix(name: string): string {
  return `【${name}】`
}

export async function getBrand(): Promise<Brand> {
  const settings = await getSiteSettings()
  const name = settings.brandName || DEFAULT_BRAND_NAME
  const tagline = settings.brandTagline || DEFAULT_BRAND_TAGLINE
  const subjectPrefix = settings.emailSubjectPrefix || buildSubjectPrefix(name)
  const emailFooterTagline = `${name} - バルーンギフトEC`
  return { name, tagline, subjectPrefix, emailFooterTagline }
}

/**
 * Synchronous fallback for places where async is impractical.
 * Always returns the static defaults — never reads SiteSettings.
 * Prefer `getBrand()` whenever you can `await`.
 */
export const FALLBACK_BRAND: Brand = {
  name: DEFAULT_BRAND_NAME,
  tagline: DEFAULT_BRAND_TAGLINE,
  subjectPrefix: buildSubjectPrefix(DEFAULT_BRAND_NAME),
  emailFooterTagline: DEFAULT_EMAIL_FOOTER_TAGLINE,
}
