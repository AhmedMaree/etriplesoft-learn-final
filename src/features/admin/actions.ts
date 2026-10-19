'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { grantableRoles } from './roles'
import type { AdminActionState } from './action-state'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function text(data: FormData, key: string): string {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

// Maps database failures to stable keys. Authority itself is enforced inside each RPC against the
// current role row, so a direct call by a learner or a revoked admin is rejected here too.
function errorKey(error: { code?: string; message?: string }): string {
  if (error.code === '42501') return 'forbidden'
  if (error.code === '23505') return 'alreadyGranted'
  if (error.code === '23514') return 'lastAdmin'
  if (error.code === 'P0002') return 'notFound'
  return 'failed'
}

export async function grantRoleAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const email = text(formData, 'email').toLowerCase()
  const role = text(formData, 'role')
  if (!EMAIL_PATTERN.test(email) || email.length > 320) return { error: 'invalidEmail' }
  if (!grantableRoles.some((allowed) => allowed === role)) return { error: 'invalidRole' }

  const supabase = await createClient()
  const { data: found, error: findError } = await supabase.rpc('admin_find_user_by_email', { p_email: email })
  if (findError) return { error: errorKey(findError) }
  const target = found?.[0]
  if (!target) return { error: 'userNotFound' }

  const { error } = await supabase.rpc('admin_grant_role', { p_user_id: target.user_id, p_role: role })
  if (error) return { error: errorKey(error) }

  revalidatePath('/[locale]/admin', 'page')
  revalidatePath('/[locale]/admin/roles', 'page')
  revalidatePath('/[locale]/admin/audit', 'page')
  return { success: 'granted' }
}

export async function revokeRoleAction(_state: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const roleId = text(formData, 'role_id')
  if (!UUID_PATTERN.test(roleId)) return { error: 'notFound' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('admin_revoke_role', { p_role_id: roleId })
  if (error) return { error: errorKey(error) }

  revalidatePath('/[locale]/admin', 'page')
  revalidatePath('/[locale]/admin/roles', 'page')
  revalidatePath('/[locale]/admin/audit', 'page')
  return { success: 'revoked' }
}
