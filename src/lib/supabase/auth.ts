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

// One Auth server round trip per request: layouts, pages and helpers rendering together share it.
const getAuthContext = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  return {
    supabase,
    user: error ? null : data.user,
  }
})

/** The signed-in user as the verified session token states it. */
export type SessionUser = { id: string; email: string | null }

// Verifies the session JWT's signature and expiry locally against the project's cached public key
// (ES256), so page guards cost no Auth server round trip. The proxy has already refreshed the token
// and applied the session policy; every data read is still authorized by RLS with this same token.
// Use requireAccountUser() where the Auth server's current user record itself is needed.
const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = error ? null : data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, email: typeof claims.email === 'string' && claims.email ? claims.email : null }
})

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser()
}

export async function requireAuthenticatedUser(
  locale: Locale,
  requestedPath: string = `/${locale}/overview`,
): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    const next = safeReturnPath(locale, requestedPath)
    redirect(`/${locale}/login?next=${encodeURIComponent(next)}`)
  }

  return user
}

/** The full Auth user record (sign-in dates, pending email change), confirmed by the Auth server. */
export async function requireAccountUser(
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

  // The role row, verified claims and activity cookie are independent; read them together.
  const [{ data, error }, { data: verified }, cookieStore] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .is('revoked_at', null)
      .maybeSingle(),
    supabase.auth.getClaims(),
    cookies(),
  ])

  if (error || !data) return { status: 'denied' }

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
