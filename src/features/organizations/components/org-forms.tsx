'use client'

import { useActionState, useState, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, Copy } from 'lucide-react'
import {
  acceptInvitationAction,
  assignCourseAction,
  buySeatsAction,
  createInvitationsAction,
  createOrganizationAction,
  grantLicenseAction,
  releaseSeatAction,
  removeMemberAction,
  revokeInvitationAction,
  setOrganizationStatusAction,
  type InviteActionState,
  type OrgActionState,
} from '../actions'

type Option = { id: string; label: string }

function Status({ state }: { state: OrgActionState }) {
  const t = useTranslations('organizations')
  return (
    <>
      {state.error && <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>}
      {state.success && <p className="admin-status success" role="status">{t(`success.${state.success}`)}</p>}
    </>
  )
}

// Destructive buttons ask once before submitting.
function confirmSubmit(message: string) {
  return (event: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(message)) event.preventDefault()
  }
}

function CopyLink({ code }: { code: string }) {
  const t = useTranslations('organizations')
  const locale = useLocale()
  const [copied, setCopied] = useState(false)
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/${locale}/join?code=${code}`
  return (
    <span className="org-copy">
      <input className="admin-code-input" readOnly value={link} aria-label={t('invite.link')} dir="ltr" onFocus={(event) => event.currentTarget.select()} />
      <button
        type="button"
        className="btn outline admin-btn-sm"
        onClick={() => navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => setCopied(false))}
      >
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        {copied ? t('invite.copied') : t('invite.copy')}
      </button>
    </span>
  )
}

export function InviteForm({ org }: { org: string }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<InviteActionState, FormData>(createInvitationsAction, {})
  return (
    <div className="org-invite">
      <form action={action} className="admin-form-grid">
        <input type="hidden" name="org" value={org} />
        <label className="admin-field admin-span-2" htmlFor="org-invite-emails">
          <span>{t('invite.emails')}</span>
          <textarea id="org-invite-emails" name="emails" rows={4} required dir="ltr" placeholder="name@company.com" aria-describedby="org-invite-hint" />
          <small id="org-invite-hint" className="admin-field-hint">{t('invite.emailsHint')}</small>
        </label>
        <label className="admin-field" htmlFor="org-invite-role">
          <span>{t('invite.role')}</span>
          <select id="org-invite-role" name="role" defaultValue="member">
            <option value="member">{t('roles.member')}</option>
            <option value="manager">{t('roles.manager')}</option>
          </select>
        </label>
        <div className="admin-form-actions">
          <button className="btn" type="submit" disabled={pending}>{pending ? t('saving') : t('invite.submit')}</button>
          <Status state={state} />
        </div>
      </form>
      {state.results && state.results.length > 0 && (
        <div className="org-invite-results" role="region" aria-label={t('invite.resultsTitle')}>
          <h3>{t('invite.resultsTitle')}</h3>
          <p className="admin-hint">{t('invite.resultsHint')}</p>
          <ul>
            {state.results.map((row) => (
              <li key={row.email}>
                <span className="admin-ltr-strong" dir="ltr">{row.email}</span>
                {row.code ? <CopyLink code={row.code} /> : <span className="admin-tag">{t(`invite.results.${row.result}`)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function RevokeInvitationButton({ org, id, email }: { org: string; id: string; email: string }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<OrgActionState, FormData>(revokeInvitationAction, {})
  return (
    <form action={action} className="admin-inline-form">
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="id" value={id} />
      <button className="btn outline admin-btn-sm admin-danger" type="submit" disabled={pending} aria-label={`${t('invite.revoke')}: ${email}`}>
        {t('invite.revoke')}
      </button>
      {state.error && <Status state={state} />}
    </form>
  )
}

export function AssignForm({ org, courses, members }: { org: string; courses: (Option & { available: number })[]; members: Option[] }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<OrgActionState, FormData>(assignCourseAction, {})
  if (courses.length === 0) return <p className="admin-empty">{t('assign.noLicenses')}</p>
  if (members.length === 0) return <p className="admin-empty">{t('assign.noMembers')}</p>
  return (
    <form action={action} className="org-assign">
      <input type="hidden" name="org" value={org} />
      <label className="admin-field" htmlFor="org-assign-course">
        <span>{t('assign.course')}</span>
        <select id="org-assign-course" name="course" required defaultValue="">
          <option value="" disabled>{t('assign.chooseCourse')}</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>{t('assign.courseOption', { title: course.label, count: course.available })}</option>
          ))}
        </select>
      </label>
      <fieldset className="org-checklist">
        <legend>{t('assign.members')}</legend>
        {members.map((member) => (
          <label key={member.id}>
            <input type="checkbox" name="members" value={member.id} />
            <span dir="auto">{member.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending}>{pending ? t('saving') : t('assign.submit')}</button>
        <Status state={state} />
      </div>
    </form>
  )
}

export function ReleaseSeatButton({ org, course, user, title }: { org: string; course: string; user: string; title: string }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<OrgActionState, FormData>(releaseSeatAction, {})
  return (
    <form action={action} className="admin-inline-form" onSubmit={confirmSubmit(t('member.releaseConfirm', { title }))}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="course" value={course} />
      <input type="hidden" name="user" value={user} />
      <button className="btn outline admin-btn-sm admin-danger" type="submit" disabled={pending} aria-label={`${t('member.release')}: ${title}`}>
        {t('member.release')}
      </button>
      {state.error && <Status state={state} />}
    </form>
  )
}

export function RemoveMemberButton({ org, user, name }: { org: string; user: string; name: string }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<OrgActionState, FormData>(removeMemberAction, {})
  return (
    <form action={action} className="admin-inline-form" onSubmit={confirmSubmit(t('members.removeConfirm', { name }))}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="user" value={user} />
      <button className="btn outline admin-btn-sm admin-danger" type="submit" disabled={pending} aria-label={`${t('members.remove')}: ${name}`}>
        {t('members.remove')}
      </button>
      {state.error && <Status state={state} />}
    </form>
  )
}

export function BuySeatsForm({ org, courses }: { org: string; courses: (Option & { priceMinor: number })[] }) {
  const t = useTranslations('organizations')
  const locale = useLocale()
  const [state, action, pending] = useActionState<OrgActionState, FormData>(buySeatsAction, {})
  const [course, setCourse] = useState('')
  const [seats, setSeats] = useState(5)
  const price = courses.find((item) => item.id === course)?.priceMinor ?? 0
  const total = new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', { style: 'currency', currency: 'EGP' }).format(
    (price * (Number.isInteger(seats) && seats > 0 ? seats : 0)) / 100,
  )
  if (courses.length === 0) return <p className="admin-empty">{t('buy.noCourses')}</p>
  return (
    <form action={action} className="admin-form-grid">
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="locale" value={locale} />
      <label className="admin-field" htmlFor="org-buy-course">
        <span>{t('buy.course')}</span>
        <select id="org-buy-course" name="course" required value={course} onChange={(event) => setCourse(event.target.value)}>
          <option value="" disabled>{t('assign.chooseCourse')}</option>
          {courses.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="admin-field" htmlFor="org-buy-seats">
        <span>{t('buy.seats')}</span>
        <input id="org-buy-seats" name="seats" type="number" min={1} max={1000} step={1} required dir="ltr" value={seats} onChange={(event) => setSeats(Number(event.target.value))} />
      </label>
      <p className="admin-span-2 org-total" aria-live="polite">
        {t('buy.total')} <strong dir="ltr">{total}</strong>
      </p>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending || !course}>{pending ? t('saving') : t('buy.submit')}</button>
        <Status state={state} />
      </div>
    </form>
  )
}

export function AcceptInvitationButton({ id, code, label }: { id?: string; code?: string; label: string }) {
  const t = useTranslations('organizations')
  const locale = useLocale()
  const [state, action, pending] = useActionState<OrgActionState, FormData>(acceptInvitationAction, {})
  return (
    <form action={action} className="admin-inline-form">
      <input type="hidden" name="locale" value={locale} />
      {id && <input type="hidden" name="id" value={id} />}
      {code && <input type="hidden" name="code" value={code} />}
      <button className="btn" type="submit" disabled={pending} aria-label={label}>{pending ? t('saving') : t('join.accept')}</button>
      <Status state={state} />
    </form>
  )
}

// ---- Platform admin ----------------------------------------------------------------------------

export function CreateOrganizationForm({ universities, companies }: { universities: Option[]; companies: Option[] }) {
  const t = useTranslations('organizations')
  const locale = useLocale()
  const [state, action, pending] = useActionState<OrgActionState, FormData>(createOrganizationAction, {})
  const [kind, setKind] = useState('company')
  const institutions = kind === 'university' ? universities : companies
  return (
    <form action={action} className="admin-form-grid">
      <input type="hidden" name="locale" value={locale} />
      <label className="admin-field" htmlFor="org-create-name">
        <span>{t('admin.name')}</span>
        <input id="org-create-name" name="name" required minLength={2} maxLength={160} dir="auto" />
      </label>
      <label className="admin-field" htmlFor="org-create-kind">
        <span>{t('admin.kind')}</span>
        <select id="org-create-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="company">{t('kinds.company')}</option>
          <option value="university">{t('kinds.university')}</option>
        </select>
      </label>
      <label className="admin-field admin-span-2" htmlFor="org-create-institution">
        <span>{t('admin.institution')}</span>
        <select id="org-create-institution" name="institution" defaultValue="" key={kind}>
          <option value="">{t('admin.noInstitution')}</option>
          {institutions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <small className="admin-field-hint">{t('admin.institutionHint')}</small>
      </label>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending}>{pending ? t('saving') : t('admin.create')}</button>
        <Status state={state} />
      </div>
    </form>
  )
}

export function OrganizationStatusButton({ org, status, name }: { org: string; status: string; name: string }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<OrgActionState, FormData>(setOrganizationStatusAction, {})
  const next = status === 'active' ? 'suspended' : 'active'
  return (
    <form action={action} className="admin-inline-form" onSubmit={next === 'suspended' ? confirmSubmit(t('admin.suspendConfirm', { name })) : undefined}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="status" value={next} />
      <button className={`btn outline ${next === 'suspended' ? 'admin-danger' : ''}`} type="submit" disabled={pending}>
        {next === 'suspended' ? t('admin.suspend') : t('admin.reactivate')}
      </button>
      <Status state={state} />
    </form>
  )
}

export function GrantLicenseForm({ org, courses }: { org: string; courses: Option[] }) {
  const t = useTranslations('organizations')
  const [state, action, pending] = useActionState<OrgActionState, FormData>(grantLicenseAction, {})
  return (
    <form action={action} className="admin-form-grid">
      <input type="hidden" name="org" value={org} />
      <label className="admin-field admin-span-2" htmlFor="org-grant-course">
        <span>{t('buy.course')}</span>
        <select id="org-grant-course" name="course" required defaultValue="">
          <option value="" disabled>{t('assign.chooseCourse')}</option>
          {courses.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="admin-field" htmlFor="org-grant-seats">
        <span>{t('buy.seats')}</span>
        <input id="org-grant-seats" name="seats" type="number" min={1} max={10000} step={1} required dir="ltr" defaultValue={10} />
      </label>
      <label className="admin-field" htmlFor="org-grant-months">
        <span>{t('admin.months')}</span>
        <input id="org-grant-months" name="months" type="number" min={1} max={36} step={1} required dir="ltr" defaultValue={12} />
      </label>
      <label className="admin-field admin-span-2" htmlFor="org-grant-note">
        <span>{t('admin.note')}</span>
        <input id="org-grant-note" name="note" maxLength={200} dir="auto" placeholder={t('admin.notePlaceholder')} />
      </label>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending}>{pending ? t('saving') : t('admin.grant')}</button>
        <Status state={state} />
      </div>
    </form>
  )
}
