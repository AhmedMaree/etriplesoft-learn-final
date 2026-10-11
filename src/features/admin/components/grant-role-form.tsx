'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { grantRoleAction } from '../actions'
import type { AdminActionState } from '../action-state'
import { grantableRoles } from '../roles'

export function GrantRoleForm() {
  const t = useTranslations('admin')
  const [state, action, pending] = useActionState<AdminActionState, FormData>(grantRoleAction, {})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="admin-form" noValidate>
      <label className="admin-field">
        <span>{t('grant.email')}</span>
        <input
          name="email"
          type="email"
          dir="ltr"
          required
          maxLength={320}
          autoComplete="off"
          aria-invalid={state.error === 'invalidEmail' || state.error === 'userNotFound' || undefined}
          aria-describedby="admin-grant-status"
        />
      </label>
      <label className="admin-field">
        <span>{t('grant.role')}</span>
        <select name="role" defaultValue="instructor">
          {grantableRoles.map((role) => (
            <option key={role} value={role}>{t(`roles.${role}`)}</option>
          ))}
        </select>
      </label>
      <button className="btn" type="submit" disabled={pending}>{t('grant.submit')}</button>
      <p id="admin-grant-status" className={`admin-status ${state.error ? 'error' : state.success ? 'success' : ''}`} role={state.error ? 'alert' : 'status'}>
        {state.error ? t(`errors.${state.error}`) : state.success ? t(`success.${state.success}`) : ''}
      </p>
    </form>
  )
}
