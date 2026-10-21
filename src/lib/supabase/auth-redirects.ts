import type { Locale } from '@/i18n/config'

// Each origin must also be listed in Supabase Auth's redirect URL allow list.
const TRUSTED_AUTH_ORIGINS = new Set([
  'http://127.0.0.1:3010',
  'https://etriplesoft-learn-final.vercel.app',
  'https://learn.etriplesoft.com',
])

const APP_ROUTES = new Set([
  'overview',
  'reset-password',
  'courses',
  'detail-course',
  'settings',
  'certificates',
  'assessment',
  'ai-page',
  'community',
  'messages',
  'calendar',
  'payment',
  'cart',
  'admin',
  'admin/audit',
  'organization',
])

// The only query-string destinations allowed: a course page (/<locale>/courses?course=<slug>),
// buying one course (/<locale>/payment?course=<slug>), resuming cart checkout (/<locale>/cart?checkout=1)
// opening an organization invitation (/<locale>/join?code=<32-character code>) and returning to an
// order's payment step (/<locale>/payment?order=<uuid>&step=checkout[&returned=1]); the order page
// itself only shows orders the signed-in learner owns.
const COURSE_RETURN_PATH = /^\/(en|ar)\/(courses|payment)\?course=[a-z0-9]+(?:-[a-z0-9]+)*$/
const CART_CHECKOUT_PATH = /^\/(en|ar)\/cart\?checkout=1$/
const INVITATION_PATH = /^\/(en|ar)\/join\?code=[A-Za-z0-9_-]{32}$/
const ORDER_RETURN_PATH = /^\/(en|ar)\/payment\?order=[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}&step=checkout(?:&returned=1)?$/

export function safeReturnPath(locale: Locale, candidate?: string | null): string {
  const fallback = `/${locale}/overview`
  if (
    candidate &&
    (COURSE_RETURN_PATH.test(candidate) ||
      CART_CHECKOUT_PATH.test(candidate) ||
      INVITATION_PATH.test(candidate) ||
      ORDER_RETURN_PATH.test(candidate)) &&
    candidate.startsWith(`/${locale}/`)
  )
    return candidate
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback
  if (candidate.includes('\\') || candidate.includes('%') || candidate.includes('?') || candidate.includes('#')) return fallback

  try {
    const parsed = new URL(candidate, 'https://etriplesoft.invalid')
    if (parsed.origin !== 'https://etriplesoft.invalid') return fallback
    const [candidateLocale, ...segments] = parsed.pathname.slice(1).split('/')
    if (candidateLocale !== locale) return fallback
    const route = segments.join('/')
    if (!APP_ROUTES.has(route)) return fallback
    return parsed.pathname
  } catch {
    return fallback
  }
}

export function trustedAuthOrigin(): string {
  const configured = process.env.AUTH_SITE_URL?.trim() || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3010' : '')
  if (!configured) throw new Error('AUTH_SITE_URL is required for Supabase email links.')

  const parsed = new URL(configured)
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('AUTH_SITE_URL must contain only a trusted origin.')
  }
  if (!TRUSTED_AUTH_ORIGINS.has(parsed.origin)) {
    throw new Error('AUTH_SITE_URL is not in the approved origin allowlist.')
  }
  return parsed.origin
}

export function authCallbackUrl(locale: Locale, next: string): string {
  const callback = new URL(`/${locale}/auth/callback`, trustedAuthOrigin())
  callback.searchParams.set('next', safeReturnPath(locale, next))
  return callback.toString()
}
