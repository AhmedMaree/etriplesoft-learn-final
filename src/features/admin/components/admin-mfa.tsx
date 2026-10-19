'use client'

import { useActionState, useState, useTransition } from 'react'
import { KeyRound } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/config'
import { Button } from '@/components/ui/primitives'
import { logoutAction } from '@/features/auth/actions'
import { startMfaEnrollmentAction, verifyMfaAction, type MfaEnrollment, type MfaVerifyState } from '../mfa-actions'

// Supabase returns the QR code as an unencoded "data:image/svg+xml;utf-8,<svg…>" string.
function qrDataUrl(value: string) {
  const svg = value.slice(value.indexOf(',') + 1)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function AdminMfa({ locale, mode }: { locale: Locale; mode: 'enroll' | 'verify' }) {
  const t = useTranslations('admin.mfa')
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [starting, startTransition] = useTransition()
  const [state, verify, verifying] = useActionState<MfaVerifyState, FormData>(verifyMfaAction.bind(null, locale), {})
  const factor = enrollment && 'factorId' in enrollment ? enrollment : null
  const error = state.error ?? (enrollment && 'error' in enrollment ? enrollment.error : undefined)
  const showCode = mode === 'verify' || factor

  return (
    <section className="panel admin-denied admin-mfa" aria-labelledby="admin-mfa-title">
      <h1 id="admin-mfa-title">{mode === 'enroll' ? t('enrollTitle') : t('verifyTitle')}</h1>
      <p>{mode === 'enroll' ? t('enrollBody') : t('verifyBody')}</p>

      {mode === 'enroll' && !factor && (
        <Button disabled={starting} onClick={() => startTransition(async () => setEnrollment(await startMfaEnrollmentAction()))}>
          {t('start')}
        </Button>
      )}

      {factor && (
        <div className="admin-mfa-setup">
          <p>{t('scan')}</p>
          {/* next/image rejects the inline SVG data URL that Supabase returns for the QR code. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl(factor.qrCode)} alt={t('qrAlt')} width={180} height={180} />
          <p>{t('secretLabel')}</p>
          <code dir="ltr">{factor.secret}</code>
        </div>
      )}

      {error && <p id="admin-mfa-error" className="admin-mfa-error" role="alert">{t(`errors.${error}`)}</p>}

      {showCode && (
        <form action={verify} className="admin-mfa-form">
          {factor && <input type="hidden" name="factorId" value={factor.factorId} />}
          <label className="field">
            <span>{t('codeLabel')}</span>
            <div className="input-wrap">
              <KeyRound size={20} />
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                dir="ltr"
                aria-invalid={state.error === 'invalidCode' || undefined}
                aria-describedby={error ? 'admin-mfa-error' : undefined}
              />
            </div>
          </label>
          <Button type="submit" disabled={verifying}>{t('verify')}</Button>
        </form>
      )}

      <form action={logoutAction.bind(null, locale)}>
        <button type="submit" className="admin-mfa-signout">{t('signOut')}</button>
      </form>
    </section>
  )
}
