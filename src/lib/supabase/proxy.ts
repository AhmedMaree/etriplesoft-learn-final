import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabasePublicEnv } from './env'
import {
  ACTIVITY_COOKIE,
  ACTIVITY_WRITE_INTERVAL_SECONDS,
  SESSION_LIMITS,
  currentActivity,
  isSessionExpired,
  serializeActivity,
  sessionScopeFor,
} from './session-policy'

// The callback exchanges a fresh sign-in code; ending an older session there could drop the PKCE verifier.
const SKIP_POLICY = /^\/(en|ar)\/auth\/callback$/

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicEnv()
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const stored = request.cookies.get(ACTIVITY_COOKIE)?.value
  const { pathname } = request.nextUrl

  if (!claims || SKIP_POLICY.test(pathname)) {
    if (!claims && stored) response.cookies.delete(ACTIVITY_COOKIE)
    return { response, expired: false }
  }

  const now = Math.floor(Date.now() / 1000)
  const activity = currentActivity(claims, stored, now)

  if (isSessionExpired(claims, activity, sessionScopeFor(pathname), now)) {
    // Revokes this session's refresh token server-side and clears the auth cookies via setAll.
    await supabase.auth.signOut({ scope: 'local' })
    response.cookies.delete(ACTIVITY_COOKIE)
    return { response, expired: true }
  }

  if (activity && (stored !== serializeActivity(activity) || now - activity.lastActiveAt >= ACTIVITY_WRITE_INTERVAL_SECONDS)) {
    response.cookies.set(ACTIVITY_COOKIE, serializeActivity({ ...activity, lastActiveAt: now }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_LIMITS.learner.maxSeconds,
    })
  }

  return { response, expired: false }
}
