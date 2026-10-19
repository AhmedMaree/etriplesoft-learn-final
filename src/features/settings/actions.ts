'use server'

import { redirect } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { authCallbackUrl } from '@/lib/supabase/auth-redirects'
import { createClient } from '@/lib/supabase/server'
import { isRateLimitError } from '@/features/auth/rate-limit'
import { isSupportedTimeZone } from './timezones'
import { preferenceKeys, type PreferenceKey } from './tabs'

type LearnerProfileUpdate = {
  learner_type: 'student' | 'professional'
  birth_year: number | null
  university: string | null
  faculty: string | null
  graduation_year: number | null
  job_title: string | null
  company_name: string | null
  years_experience: number | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function trimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function optionalText(value: unknown): string | null | false {
  const text = trimmed(value)
  if (!text) return null
  return text.length > 120 ? false : text
}

function optionalNumber(value: unknown, pattern: RegExp, minimum: number, maximum: number): number | null | false {
  const text = trimmed(value)
  if (!text) return null
  if (!pattern.test(text)) return false
  const number = Number(text)
  return number >= minimum && number <= maximum ? number : false
}

// Mirrors the signup validation and the learner_profiles type/field CHECK constraints. The
// company-invited classification is never selectable here: it carries no fields and must not be
// self-assigned.
function parseLearnerProfile(input: unknown): LearnerProfileUpdate | null {
  if (typeof input !== 'object' || input === null) return null
  const value = input as Record<string, unknown>
  if (value.learnerType === 'student') {
    const university = optionalText(value.university)
    const faculty = optionalText(value.faculty)
    const birthYear = optionalNumber(value.birthYear, /^\d{4}$/, 1900, new Date().getFullYear())
    const graduationYear = optionalNumber(value.graduationYear, /^\d{4}$/, 1900, 2100)
    if (!university || !faculty || birthYear === false || graduationYear === false) return null
    return {
      learner_type: 'student',
      university,
      faculty,
      birth_year: birthYear,
      graduation_year: graduationYear,
      job_title: null,
      company_name: null,
      years_experience: null,
    }
  }
  if (value.learnerType === 'professional') {
    const jobTitle = optionalText(value.jobTitle)
    const companyName = optionalText(value.companyName)
    const experience = optionalNumber(value.yearsExperience, /^\d{1,2}$/, 0, 60)
    if (jobTitle === false || companyName === false || experience === false) return null
    return {
      learner_type: 'professional',
      university: null,
      faculty: null,
      birth_year: null,
      graduation_year: null,
      job_title: jobTitle,
      company_name: companyName,
      years_experience: experience,
    }
  }
  return null
}

export async function saveSettingsAction(input: unknown): Promise<'saved' | 'invalid' | 'failed'> {
  if (typeof input !== 'object' || input === null) return 'invalid'
  const value = input as Record<string, unknown>
  // Profile fields are optional: the preference-only tabs submit just the toggles.
  const displayName = value.displayName === undefined ? undefined : trimmed(value.displayName)
  const timezone = value.timezone === undefined ? undefined : trimmed(value.timezone)
  if (displayName !== undefined && (displayName.length < 1 || displayName.length > 120)) return 'invalid'
  if (timezone !== undefined && !isSupportedTimeZone(timezone)) return 'invalid'
  const learnerProfile = value.learnerProfile === undefined ? undefined : parseLearnerProfile(value.learnerProfile)
  if (learnerProfile === null) return 'invalid'
  if (typeof value.preferences !== 'object' || value.preferences === null || Array.isArray(value.preferences)) return 'invalid'

  const rawPreferences = value.preferences as Record<string, unknown>
  const preferences: Partial<Record<PreferenceKey, boolean>> = {}
  for (const key of preferenceKeys) {
    if (typeof rawPreferences[key] !== 'boolean') return 'invalid'
    preferences[key] = rawPreferences[key]
  }
  if (Object.keys(rawPreferences).some((key) => !preferenceKeys.includes(key as PreferenceKey))) return 'invalid'

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data.user) return 'failed'

  if (displayName !== undefined) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', data.user.id)
    if (profileError) return 'failed'
  }

  if (learnerProfile !== undefined) {
    // Only student and professional rows may be edited; a company-invited row stays as issued.
    const { data: updated, error: learnerError } = await supabase
      .from('learner_profiles')
      .update(learnerProfile)
      .eq('user_id', data.user.id)
      .in('learner_type', ['student', 'professional'])
      .select('user_id')
      .maybeSingle()
    if (learnerError || !updated) return 'failed'
  }

  const { error: preferencesError } = await supabase
    .from('learner_preferences')
    .update({ ...(timezone === undefined ? {} : { timezone }), ...preferences })
    .eq('user_id', data.user.id)
  return preferencesError ? 'failed' : 'saved'
}

export async function removeAvatarAction(): Promise<'removed' | 'failed'> {
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data.user) return 'failed'

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_object_key: null })
    .eq('id', data.user.id)
  if (profileError) return 'failed'
  // The profile no longer references the object; a failed removal leaves an orphan for the
  // storage:orphans cleanup script rather than a broken avatar.
  await supabase.storage.from('avatars').remove([`${data.user.id}/avatar`])
  return 'removed'
}

export type PasswordChangeResult =
  | 'updated'
  | 'invalidCurrent'
  | 'weakPassword'
  | 'passwordMismatch'
  | 'samePassword'
  | 'rateLimited'
  | 'failed'

export async function changePasswordAction(input: unknown): Promise<PasswordChangeResult> {
  if (typeof input !== 'object' || input === null) return 'failed'
  const { currentPassword, newPassword, confirmPassword } = input as Record<string, unknown>
  if (typeof currentPassword !== 'string' || currentPassword.length === 0) return 'invalidCurrent'
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) return 'weakPassword'
  if (newPassword !== confirmPassword) return 'passwordMismatch'
  if (newPassword === currentPassword) return 'samePassword'

  try {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user?.email) return 'failed'

    // A live session alone is not enough to change the password: the learner proves they know
    // the current one, so an unattended signed-in browser cannot be used to take the account over.
    const { data: verified, error: verifyError } = await supabase.auth.signInWithPassword({
      email: data.user.email,
      password: currentPassword,
    })
    if (verifyError) return isRateLimitError(verifyError) ? 'rateLimited' : 'invalidCurrent'
    if (verified.user?.id !== data.user.id) return 'failed'

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      if (isRateLimitError(error)) return 'rateLimited'
      if (error.code === 'same_password') return 'samePassword'
      if (error.code === 'weak_password') return 'weakPassword'
      return 'failed'
    }
    // Any other device that may have known the old password loses its session.
    await supabase.auth.signOut({ scope: 'others' })
    return 'updated'
  } catch {
    return 'failed'
  }
}

export type EmailChangeResult = 'sent' | 'invalidEmail' | 'sameEmail' | 'rateLimited' | 'failed'

export async function changeEmailAction(localeValue: string, input: unknown): Promise<EmailChangeResult> {
  if (!isLocale(localeValue)) return 'failed'
  const email = trimmed(input).toLowerCase()
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return 'invalidEmail'

  try {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user) return 'failed'
    if (data.user.email?.toLowerCase() === email) return 'sameEmail'

    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: authCallbackUrl(localeValue, `/${localeValue}/settings`) },
    )
    if (error) {
      if (isRateLimitError(error)) return 'rateLimited'
      // Do not reveal whether another account already uses the address.
      if (error.code === 'email_exists') return 'sent'
      if (error.code === 'email_address_invalid') return 'invalidEmail'
      return 'failed'
    }
    return 'sent'
  } catch {
    return 'failed'
  }
}

export async function signOutOtherSessionsAction(): Promise<'done' | 'failed'> {
  try {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user) return 'failed'
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    return error ? 'failed' : 'done'
  } catch {
    return 'failed'
  }
}

export async function signOutEverywhereAction(localeValue: string): Promise<'failed'> {
  const locale = isLocale(localeValue) ? localeValue : 'en'
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) return 'failed'
  redirect(`/${locale}/login`)
}
