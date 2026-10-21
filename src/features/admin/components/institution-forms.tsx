'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import type { AdminActionState } from '../action-state'
import { createInstitutionAction, linkInstitutionNameAction } from '../institution-actions'

type Kind = 'university' | 'company'
export type InstitutionOption = { id: string; label: string }

function Status({ state }: { state: AdminActionState }) {
  const t = useTranslations('admin.institutions')
  if (state.error) return <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>
  if (state.success) return <p className="admin-status success" role="status">{t(`success.${state.success}`)}</p>
  return null
}

/** Maps one typed name (and every spelling that folds to it) to an existing institution. */
export function LinkNameForm({ kind, name, options, index }: { kind: Kind; name: string; options: InstitutionOption[]; index: number }) {
  const t = useTranslations('admin.institutions')
  const [state, action, pending] = useActionState<AdminActionState, FormData>(linkInstitutionNameAction, {})
  const id = `institution-link-${index}`
  return (
    <form action={action} className="admin-institution-link">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="name" value={name} />
      <label className="admin-visually-hidden" htmlFor={id}>{t('linkLabel', { name })}</label>
      <select id={id} name="institution" defaultValue="" required>
        <option value="" disabled>{t('choose')}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
      <button className="btn outline admin-btn-sm" type="submit" disabled={pending || options.length === 0}>
        {pending ? t('saving') : t('link')}
      </button>
      <Status state={state} />
    </form>
  )
}

/** Adds an institution; optionally folds in one of the typed names waiting for review. */
export function CreateInstitutionForm({ kind, unmatched }: { kind: Kind; unmatched: string[] }) {
  const t = useTranslations('admin.institutions')
  const [state, action, pending] = useActionState<AdminActionState, FormData>(createInstitutionAction, {})
  return (
    <form action={action} className="admin-form-grid">
      <input type="hidden" name="kind" value={kind} />
      <label className="admin-field" htmlFor="institution-name-en">
        <span>{t('nameEn')}</span>
        <input id="institution-name-en" name="name_en" dir="ltr" required minLength={2} maxLength={160} />
      </label>
      <label className="admin-field" htmlFor="institution-name-ar">
        <span>{t('nameAr')}</span>
        <input id="institution-name-ar" name="name_ar" dir="rtl" lang="ar" minLength={2} maxLength={160} />
      </label>
      <label className="admin-field admin-span-2" htmlFor="institution-link-name">
        <span>{t('foldIn')}</span>
        <select id="institution-link-name" name="link_name" defaultValue="">
          <option value="">{t('foldInNone')}</option>
          {unmatched.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <small className="admin-field-hint">{t('foldInHint')}</small>
      </label>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t('saving') : t('create')}
        </button>
        <Status state={state} />
      </div>
    </form>
  )
}
