import { getTranslations } from 'next-intl/server'
import { Building2, Info, KeyRound } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { getPathname, Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { AcceptInvitationButton } from './org-forms'
import { OrgManagement, type OrgTab } from './org-sections'

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(value))
}

/** The learner-side organization page: pending invitations, memberships and, for managers, management. */
export async function OrganizationPortal({ locale, orgId, tab }: { locale: Locale; orgId: string | undefined; tab: OrgTab }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const supabase = await createClient()
  const [orgResult, inviteResult] = await Promise.all([supabase.rpc('learner_list_organizations'), supabase.rpc('learner_list_invitations')])
  if (orgResult.error || inviteResult.error) return <p className="admin-status error" role="alert">{t('errors.failed')}</p>
  const orgs = orgResult.data ?? []
  const invitations = inviteResult.data ?? []
  const selected = orgs.find((org) => org.id === orgId) ?? orgs[0]

  return (
    <>
      {invitations.length > 0 && (
        <section className="panel admin-card" aria-labelledby="org-invitations">
          <h2 id="org-invitations">{t('join.pendingTitle')}</h2>
          <ul className="org-invitation-list">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <div>
                  <strong dir="auto">{invitation.organization_name}</strong>
                  <span className="admin-sub">
                    {t('join.asRole', { role: t(`roles.${invitation.role}`) })} · {t('join.expires', { date: formatDate(invitation.expires_at, locale) })}
                  </span>
                </div>
                <AcceptInvitationButton id={invitation.id} label={`${t('join.accept')}: ${invitation.organization_name}`} />
              </li>
            ))}
          </ul>
          <p className="admin-hint">{t('join.consent')}</p>
        </section>
      )}

      {!selected ? (
        <section className="panel admin-card" aria-labelledby="org-empty">
          <h2 id="org-empty">{t('portal.emptyTitle')}</h2>
          <p className="admin-hint">{t('portal.emptyText')}</p>
          <form className="admin-analytics-search" method="get" action={getPathname({ locale, href: '/join' })}>
            <label className="admin-visually-hidden" htmlFor="org-code">{t('join.codeLabel')}</label>
            <input id="org-code" name="code" required minLength={32} maxLength={32} dir="ltr" placeholder={t('join.codePlaceholder')} autoComplete="off" />
            <button className="btn outline" type="submit">
              <KeyRound size={16} aria-hidden="true" />
              {t('join.continue')}
            </button>
          </form>
        </section>
      ) : (
        <>
          {orgs.length > 1 && (
            <nav className="admin-tabs" aria-label={t('portal.switch')}>
              {orgs.map((org) => (
                <Link key={org.id} href={`/organization?org=${org.id}`} aria-current={org.id === selected.id ? 'page' : undefined}>
                  <span dir="auto">{org.name}</span>
                </Link>
              ))}
            </nav>
          )}
          <div className="org-identity">
            <span className="admin-stat-icon blue" aria-hidden="true"><Building2 size={20} /></span>
            <div>
              <h2 dir="auto">{selected.name}</h2>
              <p className="admin-sub">
                {t(`kinds.${selected.kind}`)} · {t('portal.yourRole', { role: t(`roles.${selected.role}`) })}
                {selected.status !== 'active' && ` · ${t('portal.suspended')}`}
              </p>
            </div>
          </div>
          {selected.role === 'manager' && selected.status === 'active' ? (
            <OrgManagement
              locale={locale}
              orgId={selected.id}
              tab={tab}
              mode="manager"
              links={{
                tab: (value) => `/organization?org=${selected.id}&tab=${value}`,
                member: (userId) => `/organization/members/${userId}?org=${selected.id}`,
                back: `/organization?org=${selected.id}&tab=members`,
              }}
            />
          ) : (
            <aside className="admin-note">
              <Info size={18} aria-hidden="true" />
              <p>
                {t('portal.memberText')}{' '}
                <Link className="admin-text-link" href="/overview">{t('portal.myLearning')}</Link>
              </p>
            </aside>
          )}
        </>
      )}
    </>
  )
}

/** Explains an invitation code before the learner accepts it. */
export async function JoinInvitation({ locale, code }: { locale: Locale; code: string }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const valid = /^[A-Za-z0-9_-]{32}$/.test(code)
  const { data, error } = valid ? await (await createClient()).rpc('learner_preview_invitation', { p_code: code }) : { data: null, error: null }
  const invitation = data?.[0]
  return (
    <section className="panel admin-card org-join" aria-labelledby="org-join">
      {!invitation || error ? (
        <>
          <h2 id="org-join">{t('join.invalidTitle')}</h2>
          <p className="admin-hint">{t('join.invalidText')}</p>
          <Link className="btn outline" href="/organization">{t('join.openPortal')}</Link>
        </>
      ) : (
        <>
          <h2 id="org-join">{t('join.title', { name: invitation.organization_name })}</h2>
          <p className="admin-sub">{t('join.asRole', { role: t(`roles.${invitation.role}`) })} · {t('join.expires', { date: formatDate(invitation.expires_at, locale) })}</p>
          <aside className="admin-note">
            <Info size={18} aria-hidden="true" />
            <p>{t('join.consent')}</p>
          </aside>
          {invitation.email_matches ? (
            <AcceptInvitationButton code={code} label={`${t('join.accept')}: ${invitation.organization_name}`} />
          ) : (
            <p className="admin-status error" role="alert">{t('errors.otherEmail')}</p>
          )}
        </>
      )}
    </section>
  )
}
