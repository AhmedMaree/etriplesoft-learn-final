import 'server-only'
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
  requestedPath: string = `/${locale}`,
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

  if (error || !data) redirect(`/${locale}`)

  return user
}
