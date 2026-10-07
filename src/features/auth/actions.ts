'use server'

import { redirect } from 'next/navigation'
import { isLocale, type Locale } from '@/i18n/config'
import { authCallbackUrl, safeReturnPath } from '@/lib/supabase/auth-redirects'
import { createClient } from '@/lib/supabase/server'
import type { AuthActionState } from './action-state'

function text(data: FormData, key: string): string {
  const value = data.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getLocale(value: string): Locale | null {
  return isLocale(value) ? value : null
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

  if (displayName.length < 1 || displayName.length > 120) return { error: 'invalidName' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'invalidEmail' }
  if (typeof password !== 'string' || password.length < 8) return { error: 'weakPassword' }
  if (password !== confirmPassword) return { error: 'passwordMismatch' }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: authCallbackUrl(locale, safeReturnPath(locale, requestedNext)),
      },
    })
    if (error) return { error: 'signupFailed' }
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
    await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authCallbackUrl(locale, `/${locale}`) },
    })
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
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(locale, `/${locale}/reset-password`),
    })
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
