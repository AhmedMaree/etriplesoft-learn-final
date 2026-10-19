'use client'

import { useState, type FormEvent } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { KeyRound, Lock, LogOut, MonitorSmartphone, ShieldCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/primitives'
import { Field } from '@/components/ui/field'
import { useDemoToast } from '@/lib/browser/demo-toast'
import {
  changePasswordAction,
  signOutEverywhereAction,
  signOutOtherSessionsAction,
  type PasswordChangeResult,
} from '@/features/settings/actions'
import type { Locale } from '@/i18n/config'

export function SecuritySection({ lastSignInAt, timezone, locale }: { lastSignInAt: string | null; timezone: string; locale: Locale }) {
  const t = useTranslations('settings')
  const auth = useTranslations('auth')
  const format = useFormatter()
  const notify = useDemoToast()
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<PasswordChangeResult | null>(null)
  const [sessionBusy, setSessionBusy] = useState<'others' | 'all' | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const strength = passwordStrength(newPassword)

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaving(true)
    const outcome = await changePasswordAction({
      currentPassword: data.get('current_password'),
      newPassword: data.get('new_password'),
      confirmPassword: data.get('confirm_password'),
    })
    setSaving(false)
    setResult(outcome)
    if (outcome === 'updated') {
      notify(t('passwordChanged'))
      setNewPassword('')
      setVersion((current) => current + 1)
    }
  }

  async function signOutOthers() {
    setSessionBusy('others')
    const outcome = await signOutOtherSessionsAction()
    setSessionBusy(null)
    notify(outcome === 'done' ? t('otherSessionsSignedOut') : t('saveError'))
  }

  async function signOutEverywhere() {
    if (!window.confirm(t('signOutEverywhereConfirm'))) return
    setSessionBusy('all')
    const outcome = await signOutEverywhereAction(locale)
    // Success redirects to the login page; reaching here means it failed.
    setSessionBusy(null)
    if (outcome === 'failed') notify(t('saveError'))
  }

  return (
    <div className="settings-section">
      <form
        key={version}
        className="settings-subsection first"
        onSubmit={changePassword}
        onInput={(event) => {
          const input = event.target as HTMLInputElement
          if (input.name === 'new_password') setNewPassword(input.value)
        }}
      >
        <h2><KeyRound size={20} aria-hidden="true" />{t('changePassword')}</h2>
        <p>{t('changePasswordCopy')}</p>
        <div className="form-grid">
          <Field
            label={t('currentPasswordLabel')}
            name="current_password"
            icon={Lock}
            type="password"
            required
            autoComplete="current-password"
            showPasswordLabel={auth('showPassword')}
            hidePasswordLabel={auth('hidePassword')}
          />
          <div className="password-field">
            <Field
              label={t('newPasswordLabel')}
              name="new_password"
              icon={Lock}
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              showPasswordLabel={auth('showPassword')}
              hidePasswordLabel={auth('hidePassword')}
            />
            <div className={`password-meter level-${strength}`} aria-hidden={newPassword ? undefined : true}>
              <span /><span /><span /><span />
            </div>
            <small className="field-help" aria-live="polite">
              {newPassword ? t(`passwordStrength.${['weak', 'weak', 'fair', 'good', 'strong'][strength]}`) : auth('passwordHint')}
            </small>
          </div>
          <Field
            label={t('confirmNewPassword')}
            name="confirm_password"
            icon={Lock}
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            showPasswordLabel={auth('showPassword')}
            hidePasswordLabel={auth('hidePassword')}
          />
        </div>
        {result === 'updated' ? (
          <p className="settings-message success" role="status">{t('passwordChanged')}</p>
        ) : result ? (
          <p className="settings-message error" role="alert">{t(`passwordErrors.${result}`)}</p>
        ) : null}
        <div className="settings-inline-actions">
          <Link className="text-link" href="/forgot-password">{auth('forgotPassword')}</Link>
          <Button type="submit" disabled={saving}>{saving ? t('saving') : t('updatePassword')}</Button>
        </div>
      </form>

      <div className="settings-subsection">
        <h2><MonitorSmartphone size={20} aria-hidden="true" />{t('sessions')}</h2>
        <div className="settings-action-row">
          <div>
            <strong><ShieldCheck size={16} aria-hidden="true" /> {t('currentSession')}</strong>
            <p>
              {t('lastSignInAt', {
                date: lastSignInAt
                  ? format.dateTime(new Date(lastSignInAt), { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone })
                  : t('never'),
              })}
            </p>
          </div>
        </div>
        <div className="settings-action-row">
          <div>
            <strong>{t('signOutOthers')}</strong>
            <p>{t('signOutOthersCopy')}</p>
          </div>
          <Button outline onClick={() => void signOutOthers()} disabled={sessionBusy !== null}>
            {sessionBusy === 'others' ? t('saving') : t('signOutOthersAction')}
          </Button>
        </div>
        <div className="settings-action-row">
          <div>
            <strong>{t('signOutEverywhere')}</strong>
            <p>{t('signOutEverywhereCopy')}</p>
          </div>
          <Button outline className="danger-outline" onClick={() => void signOutEverywhere()} disabled={sessionBusy !== null}>
            <LogOut size={18} aria-hidden="true" />{sessionBusy === 'all' ? t('saving') : t('signOutEverywhereAction')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// A coarse guide only; the server enforces the actual minimum length.
function passwordStrength(value: string): number {
  if (value.length < 8) return value ? 1 : 0
  let score = 1
  if (value.length >= 12) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++
  return Math.min(score, 4)
}
