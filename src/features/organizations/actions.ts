'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { emailAssignments, emailInvitations } from './emails'

// Every action re-validates its input; authority is decided inside each RPC (organization manager or
// MFA-verified admin, or the invited learner for acceptance). Errors are stable message keys under
// organizations.errors, never database text.
export type OrgActionState = { error?: string; success?: string }
export type InviteResult = { email: string; code: string | null; result: string }
export type InviteActionState = OrgActionState & { results?: InviteResult[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE = /^[A-Za-z0-9_-]{32}$/

function text(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function errorKey(error: { code?: string }) {
  if (error.code === '42501') return 'denied'
  if (error.code === 'P0002') return 'missing'
  if (error.code === '54000') return 'limit'
  if (error.code === '23514') return 'rule'
  if (error.code === '23505') return 'duplicate'
  if (error.code === '22023') return 'invalid'
  return 'failed'
}

function refresh() {
  revalidatePath('/[locale]/organization', 'layout')
  revalidatePath('/[locale]/admin/organizations', 'layout')
}

// ---- Managers and admins -----------------------------------------------------------------------

export async function createInvitationsAction(_state: InviteActionState, form: FormData): Promise<InviteActionState> {
  const org = text(form, 'org')
  const role = (['manager', 'member'] as const).find((value) => value === text(form, 'role'))
  // One address per line or separated by commas, semicolons or spaces.
  const emails = text(form, 'emails').split(/[\s,;]+/).filter(Boolean)
  if (!UUID.test(org) || !role || emails.length < 1 || emails.length > 100) return { error: 'invalid' }
  const { data, error } = await (await createClient()).rpc('org_create_invitations', { p_org: org, p_emails: emails, p_role: role })
  if (error) return { error: errorKey(error) }
  refresh()
  const results = (data ?? []).map((row) => ({ email: row.email, code: row.code ?? null, result: row.result }))
  // The links are always shown as well, so a failed or unconfigured email never loses an invitation.
  const invited = results.flatMap((row) => (row.code ? [{ email: row.email, code: row.code }] : []))
  const emailed = invited.length > 0 && (await emailInvitations(org, role, invited))
  return { success: emailed ? 'invitedEmailed' : 'invited', results }
}

export async function revokeInvitationAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const id = text(form, 'id')
  if (!UUID.test(org) || !UUID.test(id)) return { error: 'invalid' }
  const { error } = await (await createClient()).rpc('org_revoke_invitation', { p_org: org, p_invitation_id: id })
  if (error) return { error: errorKey(error) }
  refresh()
  return { success: 'revoked' }
}

export async function assignCourseAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const course = text(form, 'course')
  const users = form.getAll('members').filter((value): value is string => typeof value === 'string' && UUID.test(value))
  if (!UUID.test(org) || !UUID.test(course)) return { error: 'invalid' }
  if (users.length < 1 || users.length > 200) return { error: 'noMembers' }
  const { data, error } = await (await createClient()).rpc('org_assign_course', { p_org: org, p_course_id: course, p_user_ids: users })
  if (error) return { error: errorKey(error) }
  refresh()
  const rows = data ?? []
  await emailAssignments(org, course, rows.filter((row) => row.result === 'assigned').map((row) => row.user_id))
  const assigned = rows.filter((row) => row.result === 'assigned').length
  if (assigned === rows.length) return { success: 'assigned' }
  if (rows.some((row) => row.result === 'no_seats')) return assigned ? { success: 'assignedPartly', error: 'noSeats' } : { error: 'noSeats' }
  return assigned ? { success: 'assignedPartly' } : { error: 'alreadyAssigned' }
}

export async function releaseSeatAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const course = text(form, 'course')
  const user = text(form, 'user')
  if (!UUID.test(org) || !UUID.test(course) || !UUID.test(user)) return { error: 'invalid' }
  const { error } = await (await createClient()).rpc('org_release_seat', { p_org: org, p_course_id: course, p_user_id: user })
  if (error) return { error: errorKey(error) }
  refresh()
  return { success: 'released' }
}

export async function removeMemberAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const user = text(form, 'user')
  if (!UUID.test(org) || !UUID.test(user)) return { error: 'invalid' }
  const { error } = await (await createClient()).rpc('org_remove_member', { p_org: org, p_user_id: user })
  if (error) return { error: error.code === '23514' ? 'lastManager' : errorKey(error) }
  refresh()
  return { success: 'removed' }
}

// Creates a server-priced seat order and continues in the regular Kashier checkout.
export async function buySeatsAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const locale = text(form, 'locale')
  const course = text(form, 'course')
  const seats = Number(text(form, 'seats'))
  if (!UUID.test(org) || !isLocale(locale) || !UUID.test(course) || !Number.isInteger(seats) || seats < 1 || seats > 1000) {
    return { error: 'invalid' }
  }
  const { data, error } = await (await createClient()).rpc('org_create_seat_order', {
    p_org: org,
    p_course_ids: [course],
    p_seats: [seats],
    p_locale: locale,
  })
  if (error || !data) return { error: error ? errorKey(error) : 'failed' }
  redirect(`/${locale}/payment?order=${data}&step=checkout`)
}

// ---- Learners --------------------------------------------------------------------------------

export async function acceptInvitationAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const locale = text(form, 'locale')
  const id = text(form, 'id')
  const code = text(form, 'code')
  if (!isLocale(locale) || (id ? !UUID.test(id) : !CODE.test(code))) return { error: 'invalid' }
  const { data, error } = await (await createClient()).rpc('learner_accept_invitation', id ? { p_invitation_id: id } : { p_code: code })
  if (error || !data) return { error: error?.code === '42501' ? 'otherEmail' : error ? errorKey(error) : 'failed' }
  refresh()
  redirect(`/${locale}/organization?org=${data}`)
}

// ---- Platform admins ---------------------------------------------------------------------------

export async function createOrganizationAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const name = text(form, 'name')
  const kind = text(form, 'kind')
  const institution = text(form, 'institution')
  if (name.length < 2 || name.length > 160 || !['company', 'university'].includes(kind) || (institution && !UUID.test(institution))) {
    return { error: 'invalid' }
  }
  const { data, error } = await (await createClient()).rpc('admin_create_organization', {
    p_name: name,
    p_kind: kind,
    p_institution_id: institution || undefined,
  })
  if (error || !data) return { error: error ? errorKey(error) : 'failed' }
  refresh()
  redirect(`/${text(form, 'locale') === 'ar' ? 'ar' : 'en'}/admin/organizations/${data}?tab=invitations`)
}

export async function setOrganizationStatusAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const status = text(form, 'status')
  if (!UUID.test(org) || !['active', 'suspended'].includes(status)) return { error: 'invalid' }
  const { error } = await (await createClient()).rpc('admin_set_organization_status', { p_org: org, p_status: status })
  if (error) return { error: errorKey(error) }
  refresh()
  return { success: status === 'active' ? 'reactivated' : 'suspended' }
}

export async function grantLicenseAction(_state: OrgActionState, form: FormData): Promise<OrgActionState> {
  const org = text(form, 'org')
  const course = text(form, 'course')
  const seats = Number(text(form, 'seats'))
  const months = Number(text(form, 'months'))
  const note = text(form, 'note')
  if (
    !UUID.test(org) || !UUID.test(course) || !Number.isInteger(seats) || seats < 1 || seats > 10000 ||
    !Number.isInteger(months) || months < 1 || months > 36 || note.length > 200
  ) {
    return { error: 'invalid' }
  }
  const { error } = await (await createClient()).rpc('admin_grant_organization_license', {
    p_org: org,
    p_course_id: course,
    p_seats: seats,
    p_months: months,
    p_note: note || undefined,
  })
  if (error) return { error: errorKey(error) }
  refresh()
  return { success: 'granted' }
}
