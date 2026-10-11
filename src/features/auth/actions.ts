'use server'

import { redirect } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { authCallbackUrl, safeReturnPath } from '@/lib/supabase/auth-redirects'
import { createClient } from '@/lib/supabase/server'
import { isRateLimitError } from './rate-limit'
import type { AuthActionState } from './action-state'

function text(data: FormData, key: string): string {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getLocale(value: string): Locale | null {
  return isLocale(value) ? value : null
}

function optionalYear(value: string, minimum: number, maximum: number): number | null | false {
  if (!value) return null
  if (!/^\d{4}$/.test(value)) return false
  const year = Number(value)
  return year >= minimum && year <= maximum ? year : false
}

export async function signupAction(
  localeValue: string,
  requestedNext: string,
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = getLocale(localeValue)
  if (!locale) return { error: 'unexpected' }

  const displayName = text(formData, 'display_name')
  const email = text(formData, 'email').toLowerCase()
  const password = formData.get('password')
  const confirmPassword = formData.get('confirm_password')
  const learnerType = text(formData, 'learner_type')

  if (displayName.length < 1 || displayName.length > 120) return { error: 'invalidName' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'invalidEmail' }
  if (typeof password !== 'string' || password.length < 8) return { error: 'weakPassword' }
  if (password !== confirmPassword) return { error: 'passwordMismatch' }

  const learnerProfile: Record<string, string | number | null> = { learner_type: learnerType }
  if (learnerType === 'student') {
    const university = text(formData, 'university')
    const faculty = text(formData, 'faculty')
    const birthYear = optionalYear(text(formData, 'birth_year'), 1900, new Date().getFullYear())
    const graduationYear = optionalYear(text(formData, 'graduation_year'), 1900, 2100)
    if (!university || !faculty) return { error: 'studentFieldsRequired' }
    if (university.length > 120 || faculty.length > 120 || birthYear === false || graduationYear === false) {
      return { error: 'invalidLearnerFields' }
    }
    Object.assign(learnerProfile, {
      university,
      faculty,
      birth_year: birthYear,
      graduation_year: graduationYear,
    })
  } else if (learnerType === 'professional') {
    const jobTitle = text(formData, 'job_title')
    const companyName = text(formData, 'company_name')
    const experienceValue = text(formData, 'years_experience')
    const experience = experienceValue ? Number(experienceValue) : null
    if (
      jobTitle.length > 120 || companyName.length > 120 ||
      (experienceValue && (!/^\d{1,2}$/.test(experienceValue) || experience === null || experience > 60))
    ) return { error: 'invalidLearnerFields' }
    Object.assign(learnerProfile, {
      job_title: jobTitle || null,
      company_name: companyName || null,
      years_experience: experience,
    })
  } else if (learnerType === 'company_invited') {
    // The organization invitation backend is deferred. The code is intentionally
    // discarded here and this classification never grants company access.
  } else {
    return { error: 'invalidLearnerType' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // This raw signup metadata is untrusted onboarding input. The database
        // trigger validates it again; it is never used for authorization.
        data: { display_name: displayName, learner_profile: learnerProfile },
        emailRedirectTo: authCallbackUrl(locale, safeReturnPath(locale, requestedNext)),
      },
    })
    if (error) {
      if (isRateLimitError(error)) return { error: 'rateLimited' }
      return { error: error.code === 'email_address_invalid' ? 'emailAddressRejected' : 'signupFailed' }
    }
    return { success: 'verificationSent', email }
  } catch {
    return { error: 'unexpected' }
  }
}

export async function loginAction(
  localeValue: string,
  requestedNext: string,
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = getLocale(localeValue)
  if (!locale) return { error: 'unexpected' }

  const email = text(formData, 'email').toLowerCase()
  const password = formData.get('password')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'invalidEmail' }
  if (typeof password !== 'string' || password.length === 0) return { error: 'required' }

  const destination = safeReturnPath(locale, requestedNext)
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return { error: error.code === 'email_not_confirmed' ? 'emailUnverified' : 'invalidCredentials', email }
    }
  } catch {
    return { error: 'unexpected' }
  }

  redirect(destination)
}

export async function resendConfirmationAction(
  localeValue: string,
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = getLocale(localeValue)
  const email = text(formData, 'email').toLowerCase()
  if (!locale || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { success: 'resendGeneric' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authCallbackUrl(locale, `/${locale}/overview`) },
    })
    if (isRateLimitError(error)) return { error: 'rateLimited', email }
  } catch {
    // Keep the same response for unknown addresses, provider limits, and transport errors.
  }
  return { success: 'resendGeneric', email }
}

export async function forgotPasswordAction(
  localeValue: string,
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const locale = getLocale(localeValue)
  const email = text(formData, 'email').toLowerCase()
  if (!locale || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'invalidEmail' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(locale, `/${locale}/reset-password`),
    })
    if (isRateLimitError(error)) return { error: 'rateLimited', email }
  } catch {
    // The response intentionally does not reveal whether an account exists.
  }
  return { success: 'recoveryGeneric', email }
}

export async function resetPasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formData.get('password')
  const confirmPassword = formData.get('confirm_password')
  if (typeof password !== 'string' || password.length < 8) return { error: 'weakPassword' }
  if (password !== confirmPassword) return { error: 'passwordMismatch' }

  try {
    const supabase = await createClient()
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user) return { error: 'recoveryExpired' }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: 'unexpected' }
    await supabase.auth.signOut()
    return { success: 'passwordUpdated' }
  } catch {
    return { error: 'recoveryExpired' }
  }
}

export async function logoutAction(localeValue: string): Promise<never> {
  const locale = getLocale(localeValue)
  if (!locale) redirect('/en/login')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/${locale}/login`)
}

export async function updateLocalePreferenceAction(localeValue: string): Promise<void> {
  const locale = getLocale(localeValue)
  if (!locale) return
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return
  await supabase
    .from('learner_preferences')
    .update({ preferred_locale: locale })
    .eq('user_id', data.user.id)
}
