'use server'

import { redirect } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getAdminAccess } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { isRateLimitError } from '@/features/auth/rate-limit'

export type MfaEnrollment = { factorId: string; qrCode: string; secret: string } | { error: 'failed' | 'rateLimited' }
export type MfaVerifyState = { error?: 'invalidCode' | 'rateLimited' | 'failed' }

const CODE = /^\d{6}$/

// Starts TOTP setup for an administrator without a verified factor. Abandoned unverified factors are
// removed first, so retrying never piles them up.
export async function startMfaEnrollmentAction(): Promise<MfaEnrollment> {
  if ((await getAdminAccess()).status !== 'mfaEnroll') return { error: 'failed' }
  const supabase = await createClient()

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) return { error: isRateLimitError(listError) ? 'rateLimited' : 'failed' }
  for (const factor of factors.all) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ETripleSoft Learn admin' })
  if (error || !data) return { error: isRateLimitError(error) ? 'rateLimited' : 'failed' }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

// Verifies a code for the pending enrollment, or for the admin's verified factor when signing in.
// Success upgrades this session to aal2; the session cookies are rewritten by the server client.
export async function verifyMfaAction(localeValue: string, _state: MfaVerifyState, formData: FormData): Promise<MfaVerifyState> {
  if (!isLocale(localeValue)) return { error: 'failed' }
  const code = String(formData.get('code') ?? '').replace(/\s/g, '')
  if (!CODE.test(code)) return { error: 'invalidCode' }

  const access = await getAdminAccess()
  if (access.status !== 'mfaEnroll' && access.status !== 'mfaVerify') return { error: 'failed' }

  const supabase = await createClient()
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
  if (listError) return { error: isRateLimitError(listError) ? 'rateLimited' : 'failed' }

  const requested = String(formData.get('factorId') ?? '')
  const factor =
    access.status === 'mfaEnroll'
      ? factors.all.find((item) => item.id === requested && item.factor_type === 'totp' && item.status === 'unverified')
      : factors.totp.find((item) => item.status === 'verified')
  if (!factor) return { error: 'failed' }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (error) return { error: isRateLimitError(error) ? 'rateLimited' : 'invalidCode' }

  redirect(`/${localeValue}/admin`)
}
