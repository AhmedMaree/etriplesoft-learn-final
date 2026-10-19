// App-enforced session lifetimes (they work on any Supabase plan). Learner limits apply to every
// signed-in request; admin limits apply on top of them to the admin area and admin APIs.
export const SESSION_LIMITS = {
  learner: { idleSeconds: 7 * 24 * 60 * 60, maxSeconds: 30 * 24 * 60 * 60 },
  admin: { idleSeconds: 60 * 60, maxSeconds: 12 * 60 * 60 },
} as const

export type SessionScope = keyof typeof SESSION_LIMITS

export const ACTIVITY_COOKIE = 'ets-session-activity'
// Rewriting the cookie at most once a minute keeps Set-Cookie churn low without blurring idle time.
export const ACTIVITY_WRITE_INTERVAL_SECONDS = 60

export type SessionActivity = { sessionId: string; startedAt: number; lastActiveAt: number }

type Claims = { session_id?: unknown; amr?: unknown }

const seconds = (value: string) => (/^\d{1,12}$/.test(value) ? Number(value) : null)

export function parseActivity(value: string | undefined): SessionActivity | null {
  const [sessionId, started, last, ...rest] = (value ?? '').split('.')
  const startedAt = seconds(started ?? '')
  const lastActiveAt = seconds(last ?? '')
  if (rest.length || !sessionId || !/^[0-9a-f-]{1,64}$/i.test(sessionId) || startedAt === null || lastActiveAt === null) return null
  return { sessionId, startedAt, lastActiveAt }
}

export const serializeActivity = (activity: SessionActivity) =>
  `${activity.sessionId}.${activity.startedAt}.${activity.lastActiveAt}`

export const sessionIdOf = (claims: Claims) =>
  typeof claims.session_id === 'string' && claims.session_id ? claims.session_id : null

// First sign-in time from the signed `amr` claim (a later MFA step-up must not extend the session);
// null when the claim has no timestamps.
export function signedInAt(claims: Claims): number | null {
  if (!Array.isArray(claims.amr)) return null
  const stamps = claims.amr
    .map((entry) => (entry && typeof entry === 'object' ? (entry as { timestamp?: unknown }).timestamp : undefined))
    .filter((stamp): stamp is number => typeof stamp === 'number' && Number.isFinite(stamp))
  return stamps.length ? Math.min(...stamps) : null
}

// Activity recorded for this session, or a fresh record when the cookie belongs to another session.
export function currentActivity(claims: Claims, cookie: string | undefined, now: number): SessionActivity | null {
  const sessionId = sessionIdOf(claims)
  if (!sessionId) return null
  const stored = parseActivity(cookie)
  if (stored && stored.sessionId === sessionId && stored.lastActiveAt <= now) return stored
  return { sessionId, startedAt: signedInAt(claims) ?? now, lastActiveAt: now }
}

export function sessionStartedAt(claims: Claims, activity: SessionActivity | null): number | null {
  return signedInAt(claims) ?? activity?.startedAt ?? null
}

export function isMaxAgeExceeded(claims: Claims, activity: SessionActivity | null, scope: SessionScope, now: number) {
  const started = sessionStartedAt(claims, activity)
  return started !== null && now - started > SESSION_LIMITS[scope].maxSeconds
}

export function isSessionExpired(claims: Claims, activity: SessionActivity | null, scope: SessionScope, now: number) {
  if (isMaxAgeExceeded(claims, activity, scope, now)) return true
  return activity !== null && now - activity.lastActiveAt > SESSION_LIMITS[scope].idleSeconds
}

// The admin limits cover the admin pages (and their server actions) plus the admin-only APIs.
export function sessionScopeFor(pathname: string): SessionScope {
  if (/^\/(en|ar)\/admin(\/|$)/.test(pathname)) return 'admin'
  if (pathname.startsWith('/api/admin/') || pathname.startsWith('/api/learning/quiz/author')) return 'admin'
  return 'learner'
}
