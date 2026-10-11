'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { revokeRoleAction } from '../actions'
import type { AdminActionState } from '../action-state'

export function RevokeRoleButton({ roleId, label }: { roleId: string; label: string }) {
  const t = useTranslations('admin')
  const [state, action, pending] = useActionState<AdminActionState, FormData>(revokeRoleAction, {})

  return (
    <form action={action} className="admin-inline-form">
      <input type="hidden" name="role_id" value={roleId} />
      <button className="btn outline admin-danger" type="submit" disabled={pending} aria-label={label}>
        {t('table.revoke')}
      </button>
      {state.error && <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>}
    </form>
  )
}
