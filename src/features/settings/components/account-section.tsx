'use client'

import { useState, type FormEvent } from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import { BadgeCheck, CircleAlert, Download, LogOut, Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/primitives'
import { Field } from '@/components/ui/field'
import { logoutAction } from '@/features/auth/actions'
import { changeEmailAction, type EmailChangeResult } from '@/features/settings/actions'
import type { AccountSummary } from '@/features/settings/tabs'
import type { Locale } from '@/i18n/config'

const SUPPORT_EMAIL = 'info@etriplesoft.com'

export function AccountSection({
  account,
  learnerType,
  timezone,
  locale,
}: {
  account: AccountSummary
  learnerType: string | null
  timezone: string
  locale: Locale
}) {
  const t = useTranslations('settings')
  const auth = useTranslations('auth')
  const common = useTranslations('common')
  const format = useFormatter()
  const [editingEmail, setEditingEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<EmailChangeResult | null>(null)
  const [pendingEmail, setPendingEmail] = useState(account.pendingEmail)

  const date = (value: string | null, withTime = false) =>
    value
      ? format.dateTime(new Date(value), withTime ? { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone } : { dateStyle: 'long', timeZone: timezone })
      : t('never')
  const typeLabel =
    learnerType === 'student' || learnerType === 'professional' || learnerType === 'company_invited'
      ? auth(`${learnerType}.label`)
      : auth('learner')

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('new_email') ?? '')
    setSending(true)
    const outcome = await changeEmailAction(locale, email)
    setSending(false)
    setResult(outcome)
    if (outcome === 'sent') {
      setPendingEmail(email.trim().toLowerCase())
      setEditingEmail(false)
    }
  }

  const deletionHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('deleteEmailSubject'))}&body=${encodeURIComponent(t('deleteEmailBody', { email: account.email }))}`

  return (
    <div className="settings-section">
      <dl className="settings-rows">
        <div>
          <dt>{t('accountEmail')}</dt>
          <dd>
            <span className="settings-value" dir="ltr">{account.email}</span>
            {account.emailConfirmedAt ? (
              <span className="badge"><BadgeCheck size={14} aria-hidden="true" />{t('verified')}</span>
            ) : (
              <span className="badge warning"><CircleAlert size={14} aria-hidden="true" />{t('unverified')}</span>
            )}
            {!editingEmail && (
              <button type="button" className="text-button" onClick={() => { setEditingEmail(true); setResult(null) }}>
                {t('changeEmail')}
              </button>
            )}
          </dd>
        </div>
        <div>
          <dt>{t('accountType')}</dt>
          <dd>{typeLabel}</dd>
        </div>
        <div>
          <dt>{t('memberSince')}</dt>
          <dd>{date(account.createdAt)}</dd>
        </div>
        <div>
          <dt>{t('lastSignIn')}</dt>
          <dd>{date(account.lastSignInAt, true)}</dd>
        </div>
      </dl>

      {pendingEmail && (
        <p className="settings-message info" role="status">{t('emailPending', { email: pendingEmail })}</p>
      )}
      {result && result !== 'sent' && (
        <p className="settings-message error" role="alert">{t(`emailErrors.${result}`)}</p>
      )}

      {editingEmail && (
        <form className="settings-inline-form" onSubmit={changeEmail}>
          <Field label={t('newEmail')} name="new_email" icon={Mail} type="email" required autoComplete="email" maxLength={254} />
          <p className="field-help">{t('changeEmailHelp')}</p>
          <div className="settings-inline-actions">
            <Button outline onClick={() => setEditingEmail(false)} disabled={sending}>{common('cancel')}</Button>
            <Button type="submit" disabled={sending}>{sending ? t('saving') : t('sendConfirmation')}</Button>
          </div>
        </form>
      )}

      <div className="settings-subsection">
        <h2>{t('dataPrivacy')}</h2>
        <div className="settings-action-row">
          <div>
            <strong>{t('downloadData')}</strong>
            <p>{t('downloadDataCopy')}</p>
          </div>
          <a className="btn outline" href="/api/account/export" download>
            <Download size={18} aria-hidden="true" />{t('downloadDataAction')}
          </a>
        </div>
        <div className="settings-action-row">
          <div>
            <strong>{t('signOutTitle')}</strong>
            <p>{t('signOutCopy')}</p>
          </div>
          <form action={logoutAction.bind(null, locale)}>
            <Button outline type="submit"><LogOut size={18} aria-hidden="true" />{auth('logout')}</Button>
          </form>
        </div>
      </div>

      <div className="settings-subsection danger-zone">
        <h2>{t('dangerZone')}</h2>
        <div className="settings-action-row">
          <div>
            <strong>{t('deleteAccount')}</strong>
            <p>{t('deleteAccountCopy')}</p>
          </div>
          <a className="btn danger-outline" href={deletionHref}>
            <Trash2 size={18} aria-hidden="true" />{t('requestDeletion')}
          </a>
        </div>
      </div>
    </div>
  )
}
