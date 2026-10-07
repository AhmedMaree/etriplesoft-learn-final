import type { Locale } from '@/i18n/config'

const TRUSTED_AUTH_ORIGINS = new Set([
  'http://127.0.0.1:3010',
  'https://etriplesoft-learn-final.vercel.app',
])

const APP_ROUTES = new Set([
  '',
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
])

export function safeReturnPath(locale: Locale, candidate?: string | null): string {
  const fallback = `/${locale}`
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
    throw new Error('AUTH_SITE_URL is not in the approved development origin allowlist.')
  }
  return parsed.origin
}

export function authCallbackUrl(locale: Locale, next: string): string {
  const callback = new URL(`/${locale}/auth/callback`, trustedAuthOrigin())
  callback.searchParams.set('next', safeReturnPath(locale, next))
  return callback.toString()
}
