'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AdminActionState } from './action-state'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KINDS = ['university', 'company'] as const

function text(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

// Stable message keys under admin.institutions.errors; authority is enforced inside each RPC.
function errorKey(error: { code?: string }) {
  if (error.code === '42501') return 'denied'
  if (error.code === '23505') return 'duplicate'
  if (error.code === 'P0002') return 'missing'
  if (error.code === '22023' || error.code === '23514') return 'invalid'
  return 'failed'
}

function refresh() {
  revalidatePath('/[locale]/admin/institutions', 'page')
  revalidatePath('/[locale]/admin/analytics', 'page')
}

export async function linkInstitutionNameAction(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const kind = KINDS.find((value) => value === text(form, 'kind'))
  const name = text(form, 'name')
  const institution = text(form, 'institution')
  if (!kind || !name || name.length > 160 || !UUID_PATTERN.test(institution)) return { error: 'invalid' }
  const { error } = await (await createClient()).rpc('admin_link_institution_name', {
    p_kind: kind,
    p_name: name,
    p_institution_id: institution,
  })
  if (error) return { error: errorKey(error) }
  refresh()
  return { success: 'linked' }
}

export async function createInstitutionAction(_state: AdminActionState, form: FormData): Promise<AdminActionState> {
  const kind = KINDS.find((value) => value === text(form, 'kind'))
  const nameEn = text(form, 'name_en')
  const nameAr = text(form, 'name_ar')
  const linkName = text(form, 'link_name')
  if (!kind || nameEn.length < 2 || nameEn.length > 160 || (nameAr && (nameAr.length < 2 || nameAr.length > 160)) || linkName.length > 160) {
    return { error: 'invalid' }
  }
  const { error } = await (await createClient()).rpc('admin_create_institution', {
    p_kind: kind,
    p_name_en: nameEn,
    p_name_ar: nameAr,
    p_link_name: linkName || undefined,
  })
  if (error) return { error: errorKey(error) }
  refresh()
  return { success: 'created' }
}
