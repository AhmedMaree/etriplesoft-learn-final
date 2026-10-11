import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Locale } from '@/i18n/config'
import { safeReturnPath } from './auth-redirects'
import { createClient } from './server'

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

export type AdminAccess = { status: 'anonymous' } | { status: 'denied' } | { status: 'admin'; user: User }

// Authority comes from the CURRENT unrevoked user_roles row on every call, never from JWT claims or
// metadata. This only decides what to render; each admin RPC re-checks the role inside the database.
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

  return error || !data ? { status: 'denied' } : { status: 'admin', user }
})
