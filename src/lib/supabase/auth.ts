import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Locale } from '@/i18n/config'
import { safeReturnPath } from './auth-redirects'
import { createClient } from './server'
import { ACTIVITY_COOKIE, isMaxAgeExceeded, parseActivity, sessionIdOf } from './session-policy'

export type ElevatedRole = 'admin' | 'instructor'

async function getAuthContext() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  return {
    supabase,
    user: error ? null : data.user,
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { user } = await getAuthContext()
  return user
}

export async function requireAuthenticatedUser(
  locale: Locale,
  requestedPath: string = `/${locale}/overview`,
): Promise<User> {
  const { user } = await getAuthContext()

  if (!user) {
    const next = safeReturnPath(locale, requestedPath)
    redirect(`/${locale}/login?next=${encodeURIComponent(next)}`)
  }

  return user
}

export async function requireRole(
  role: ElevatedRole,
  locale: Locale,
): Promise<User> {
  const { supabase, user } = await getAuthContext()

  if (!user) redirect(`/${locale}/login`)

  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', role)
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) redirect(`/${locale}/overview`)

  return user
}

export type AdminAccess =
  | { status: 'anonymous' }
  | { status: 'denied' }
  | { status: 'reauth' }
  | { status: 'mfaEnroll' }
  | { status: 'mfaVerify' }
  | { status: 'admin'; user: User }

export const PENDING_ADMIN_STATUSES = ['reauth', 'mfaEnroll', 'mfaVerify'] as const

// Local development only (`next dev`): ADMIN_MFA_DISABLED=true skips the admin MFA screen. Builds
// ignore it. The database keeps its own switch (learning_private.admin_security), which must also be
// off, or admin RPCs still refuse password-only sessions.
function adminMfaDisabledForDevelopment() {
  return process.env.NODE_ENV === 'development' && process.env.ADMIN_MFA_DISABLED === 'true'
}

// Authority comes from the CURRENT unrevoked user_roles row on every call, never from JWT claims or
// metadata. This only decides what to render; each admin RPC re-checks the role inside the database.
// Admin authority also needs a sign-in within the admin session limit ('reauth' otherwise) and an
// MFA-verified (aal2) session; public.assert_active_admin() requires aal2 as well. The proxy enforces
// the admin idle limit on admin pages and APIs.
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const { supabase, user } = await getAuthContext()
  if (!user) return { status: 'anonymous' }

  const { data, error } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) return { status: 'denied' }

  const [{ data: verified }, cookieStore] = await Promise.all([supabase.auth.getClaims(), cookies()])
  const claims = verified?.claims
  const activity = parseActivity(cookieStore.get(ACTIVITY_COOKIE)?.value)
  const sessionActivity = claims && activity?.sessionId === sessionIdOf(claims) ? activity : null
  if (!claims || isMaxAgeExceeded(claims, sessionActivity, 'admin', Math.floor(Date.now() / 1000))) {
    return { status: 'reauth' }
  }

  // `aal` comes from the verified token; factors come from the Auth server's user record.
  if (claims.aal !== 'aal2' && !adminMfaDisabledForDevelopment()) {
    const enrolled = user.factors?.some((factor) => factor.factor_type === 'totp' && factor.status === 'verified')
    return { status: enrolled ? 'mfaVerify' : 'mfaEnroll' }
  }

  return { status: 'admin', user }
})
