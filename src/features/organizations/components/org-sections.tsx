import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Info } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { listCatalogCourses } from '@/features/courses/server/course-repository'
import { formatCount, formatLongDay, formatPercent } from '@/features/admin/analytics'
import { Kpi, Meter } from '@/features/admin/components/analytics-bits'
import { AssignForm, BuySeatsForm, GrantLicenseForm, InviteForm, ReleaseSeatButton, RemoveMemberButton, RevokeInvitationButton } from './org-forms'

export const ORG_TABS = ['overview', 'members', 'invitations', 'buy'] as const
export type OrgTab = (typeof ORG_TABS)[number]

export function parseOrgTab(value: string | undefined): OrgTab {
  return ORG_TABS.find((tab) => tab === value) ?? 'overview'
}

// Where the shared sections link to: the managers' portal and the admin console use different routes.
export type OrgLinks = { tab: (tab: OrgTab) => string; member: (userId: string) => string; back: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: string | undefined): value is string => Boolean(value && UUID.test(value))

// Calendar dates in the platform timezone, Western digits in both locales.
function formatDate(value: string | null, locale: Locale) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(value))
}

const stateTone: Record<string, string> = { active: 'success', scheduled: 'security', ended: '', refunded: 'danger', revoked: 'danger' }

/** Organization management: summary, tabs and the selected tab. Authority is re-checked by every RPC. */
export async function OrgManagement({ locale, orgId, tab, links, mode }: {
  locale: Locale
  orgId: string
  tab: OrgTab
  links: OrgLinks
  // Admins grant licenses; managers buy seats.
  mode: 'manager' | 'admin'
}) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const supabase = await createClient()
  const [orgResult, licenseResult, memberResult] = await Promise.all([
    supabase.rpc('org_get', { p_org: orgId }),
    supabase.rpc('org_list_licenses', { p_org: orgId, p_locale: locale }),
    supabase.rpc('org_list_members', { p_org: orgId }),
  ])
  if (orgResult.error?.code === 'P0002') notFound()
  if (orgResult.error || licenseResult.error || memberResult.error) {
    return <p className="admin-status error" role="alert">{t(orgResult.error?.code === '42501' ? 'errors.denied' : 'errors.failed')}</p>
  }
  const org = orgResult.data?.[0]
  if (!org) notFound()
  const licenses = licenseResult.data ?? []
  const members = memberResult.data ?? []
  const count = (value: number) => formatCount(value, locale)
  const progressValues = members.map((member) => member.average_progress).filter((value): value is number => typeof value === 'number')
  const averageProgress = progressValues.length ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : null
  const tabs = mode === 'manager' ? ORG_TABS : ORG_TABS.filter((value) => value !== 'buy')

  return (
    <>
      <section className="admin-kpis" aria-label={t('summary')}>
        <Kpi label={t('kpis.seats')} value={`${count(org.seats_used)} / ${count(org.seats_total)}`} detail={t('kpis.seatsDetail')} />
        <Kpi label={t('kpis.members')} value={count(org.members)} detail={t('kpis.managers', { count: org.managers })} />
        <Kpi label={t('kpis.progress')} value={averageProgress === null ? '—' : formatPercent(averageProgress, locale)} detail={t('kpis.progressDetail')} />
        <Kpi
          label={t('kpis.completions')}
          value={count(members.reduce((sum, member) => sum + member.completed, 0))}
          detail={t('kpis.streamed', { count: members.reduce((sum, member) => sum + member.streamed_minutes, 0) })}
        />
      </section>

      <nav className="admin-tabs" aria-label={t('tabsLabel')}>
        {tabs.map((value) => (
          <Link key={value} href={links.tab(value)} aria-current={value === tab ? 'page' : undefined}>{t(`tabs.${value}`)}</Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
          <section className="panel admin-card" aria-labelledby="org-licenses">
            <div className="admin-card-head">
              <h2 id="org-licenses">{t('licenses.title')}</h2>
              <span className="admin-count" dir="ltr">{licenses.length}</span>
            </div>
            {licenses.length === 0 ? (
              <p className="admin-empty">{mode === 'manager' ? t('licenses.emptyManager') : t('licenses.emptyAdmin')}</p>
            ) : (
              <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="org-licenses">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">{t('licenses.course')}</th>
                      <th scope="col">{t('licenses.seats')}</th>
                      <th scope="col">{t('licenses.ends')}</th>
                      <th scope="col">{t('licenses.source')}</th>
                      <th scope="col">{t('licenses.state')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((license) => (
                      <tr key={license.license_id}>
                        <td>
                          <strong dir="auto">{license.course_title}</strong>
                          <span className="admin-ltr" dir="ltr">{license.course_slug}</span>
                        </td>
                        <td>
                          <Meter value={license.seats ? Math.round((license.seats_used / license.seats) * 100) : null} locale={locale} />
                          <span className="admin-sub" dir="ltr">{`${count(license.seats_used)} / ${count(license.seats)}`}</span>
                        </td>
                        <td>{formatDate(license.ends_at, locale)}</td>
                        <td>{t(`licenses.sources.${license.source}`)}</td>
                        <td><span className={`admin-tag ${stateTone[license.state] ?? ''}`}>{t(`licenses.states.${license.state}`)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {mode === 'admin' && <AdminGrantSection locale={locale} orgId={orgId} />}
        </>
      )}

      {tab === 'members' && (
        <>
          <section className="panel admin-card" aria-labelledby="org-assign">
            <h2 id="org-assign">{t('assign.title')}</h2>
            <p className="admin-hint">{t('assign.hint')}</p>
            <AssignForm
              org={orgId}
              courses={licenses
                .filter((license) => license.state === 'active')
                // One option per course, with the free seats summed over its current licenses.
                .reduce<{ id: string; label: string; available: number }[]>((list, license) => {
                  const free = Math.max(0, license.seats - license.seats_used)
                  const existing = list.find((item) => item.id === license.course_id)
                  if (existing) existing.available += free
                  else list.push({ id: license.course_id, label: license.course_title, available: free })
                  return list
                }, [])}
              members={members.map((member) => ({ id: member.user_id, label: member.display_name ? `${member.display_name} (${member.email})` : member.email }))}
            />
          </section>
          <section className="panel admin-card" aria-labelledby="org-members">
            <div className="admin-card-head">
              <h2 id="org-members">{t('members.title')}</h2>
              <span className="admin-count" dir="ltr">{members.length}</span>
            </div>
            {members.length === 0 ? (
              <p className="admin-empty">{t('members.empty')}</p>
            ) : (
              <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="org-members">
                <table className="admin-table admin-table-wide">
                  <thead>
                    <tr>
                      <th scope="col">{t('members.member')}</th>
                      <th scope="col">{t('members.courses')}</th>
                      <th scope="col">{t('members.progress')}</th>
                      <th scope="col">{t('members.quiz')}</th>
                      <th scope="col">{t('members.streamed')}</th>
                      <th scope="col">{t('members.certificates')}</th>
                      <th scope="col">{t('members.lastActive')}</th>
                      <th scope="col"><span className="admin-visually-hidden">{t('members.actions')}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => {
                      const name = member.display_name || member.email
                      return (
                        <tr key={member.user_id}>
                          <td>
                            <Link className="admin-list-main" href={links.member(member.user_id)}>
                              <strong dir="auto">{name}</strong>
                              <span className="admin-ltr" dir="ltr">{member.email}</span>
                            </Link>
                            {member.role === 'manager' && <span className="admin-tag security">{t('roles.manager')}</span>}
                          </td>
                          <td className="admin-num">
                            <span dir="ltr">{`${count(member.completed)} / ${count(member.assigned)}`}</span>
                            <span className="admin-sub">{t('members.completedOf')}</span>
                          </td>
                          <td><Meter value={member.average_progress ?? null} locale={locale} /></td>
                          <td>{member.quiz_percent === null ? <span className="admin-sub-inline">—</span> : <span dir="ltr">{formatPercent(member.quiz_percent, locale)}</span>}</td>
                          <td className="admin-num" dir="ltr">{count(member.streamed_minutes)}</td>
                          <td className="admin-num" dir="ltr">{count(member.certificates)}</td>
                          <td>{member.last_active ? formatLongDay(member.last_active, locale) : <span className="admin-sub-inline">{t('members.never')}</span>}</td>
                          <td><RemoveMemberButton org={orgId} user={member.user_id} name={name} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'invitations' && <InvitationsSection locale={locale} orgId={orgId} />}
      {tab === 'buy' && mode === 'manager' && <BuySection locale={locale} orgId={orgId} />}

      <aside className="admin-note">
        <Info size={18} aria-hidden="true" />
        <p>{t('visibilityNote')}</p>
      </aside>
    </>
  )
}

async function InvitationsSection({ locale, orgId }: { locale: Locale; orgId: string }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const { data, error } = await (await createClient()).rpc('org_list_invitations', { p_org: orgId })
  const rows = data ?? []
  return (
    <>
      <section className="panel admin-card" aria-labelledby="org-invite">
        <h2 id="org-invite">{t('invite.title')}</h2>
        <p className="admin-hint">{t('invite.hint')}</p>
        <InviteForm org={orgId} />
      </section>
      <section className="panel admin-card" aria-labelledby="org-pending">
        <div className="admin-card-head">
          <h2 id="org-pending">{t('invite.pending')}</h2>
          <span className="admin-count" dir="ltr">{rows.length}</span>
        </div>
        {error ? (
          <p className="admin-status error" role="alert">{t('errors.failed')}</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">{t('invite.none')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="org-pending">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('invite.email')}</th>
                  <th scope="col">{t('invite.role')}</th>
                  <th scope="col">{t('invite.expires')}</th>
                  <th scope="col"><span className="admin-visually-hidden">{t('members.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><span className="admin-ltr-strong" dir="ltr">{row.email}</span></td>
                    <td>{t(`roles.${row.role}`)}</td>
                    <td>{row.expired ? <span className="admin-tag danger">{t('invite.expired')}</span> : formatDate(row.expires_at, locale)}</td>
                    <td><RevokeInvitationButton org={orgId} id={row.id} email={row.email} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

async function BuySection({ locale, orgId }: { locale: Locale; orgId: string }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const { courses } = await listCatalogCourses(await createClient(), { locale, limit: 50 }).catch(() => ({ courses: [] }))
  return (
    <section className="panel admin-card" aria-labelledby="org-buy">
      <h2 id="org-buy">{t('buy.title')}</h2>
      <p className="admin-hint">{t('buy.hint')}</p>
      <BuySeatsForm
        org={orgId}
        courses={courses.filter((course) => course.priceMinor > 0).map((course) => ({ id: course.id, label: course.title, priceMinor: course.priceMinor }))}
      />
    </section>
  )
}

async function AdminGrantSection({ locale, orgId }: { locale: Locale; orgId: string }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const { courses } = await listCatalogCourses(await createClient(), { locale, limit: 50 }).catch(() => ({ courses: [] }))
  return (
    <section className="panel admin-card" aria-labelledby="org-grant">
      <h2 id="org-grant">{t('admin.grantTitle')}</h2>
      <p className="admin-hint">{t('admin.grantHint')}</p>
      <GrantLicenseForm org={orgId} courses={courses.map((course) => ({ id: course.id, label: course.title }))} />
    </section>
  )
}

/** One member's sponsored courses with everything the organization may see about them. */
export async function OrgMemberDetail({ locale, orgId, userId, links }: { locale: Locale; orgId: string; userId: string; links: OrgLinks }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const supabase = await createClient()
  const [courseResult, memberResult] = await Promise.all([
    supabase.rpc('org_list_member_courses', { p_org: orgId, p_user: userId, p_locale: locale }),
    supabase.rpc('org_list_members', { p_org: orgId }),
  ])
  if (courseResult.error?.code === 'P0002') notFound()
  if (courseResult.error || memberResult.error) {
    return <p className="admin-status error" role="alert">{t(courseResult.error?.code === '42501' ? 'errors.denied' : 'errors.failed')}</p>
  }
  const member = (memberResult.data ?? []).find((row) => row.user_id === userId)
  const rows = courseResult.data ?? []
  const count = (value: number) => formatCount(value, locale)
  return (
    <>
      <Link className="admin-back" href={links.back}>
        <ArrowLeft size={16} aria-hidden="true" className="admin-flip" />
        {t('member.back')}
      </Link>
      <div className="admin-page-header">
        <div className="admin-page-heading">
          <h1 dir="auto">{member ? member.display_name || member.email : t('member.former')}</h1>
          {member && <p className="admin-lead" dir="ltr">{member.email}</p>}
        </div>
      </div>
      {member && (
        <section className="admin-kpis" aria-label={t('summary')}>
          <Kpi label={t('members.courses')} value={`${count(member.completed)} / ${count(member.assigned)}`} detail={t('members.completedOf')} />
          <Kpi label={t('members.progress')} value={member.average_progress === null ? '—' : formatPercent(member.average_progress, locale)} />
          <Kpi label={t('members.quiz')} value={member.quiz_percent === null ? '—' : formatPercent(member.quiz_percent, locale)} detail={t('member.quizDetail')} />
          <Kpi label={t('members.streamed')} value={count(member.streamed_minutes)} detail={t('member.lastActive', { date: member.last_active ? formatLongDay(member.last_active, locale) : t('members.never') })} />
        </section>
      )}
      <section className="panel admin-card" aria-labelledby="org-member-courses">
        <h2 id="org-member-courses">{t('member.courses')}</h2>
        {rows.length === 0 ? (
          <p className="admin-empty">{t('member.none')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="org-member-courses">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th scope="col">{t('licenses.course')}</th>
                  <th scope="col">{t('member.status')}</th>
                  <th scope="col">{t('members.progress')}</th>
                  <th scope="col">{t('members.quiz')}</th>
                  <th scope="col">{t('members.streamed')}</th>
                  <th scope="col">{t('member.certificate')}</th>
                  <th scope="col">{t('member.access')}</th>
                  <th scope="col"><span className="admin-visually-hidden">{t('members.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.course_id}-${row.granted_at}`}>
                    <td>
                      <strong dir="auto">{row.course_title}</strong>
                      <span className="admin-sub">{t('member.lastActivity', { date: formatDate(row.last_activity, locale) })}</span>
                    </td>
                    <td><span className={`admin-tag ${row.status === 'completed' ? 'success' : row.status === 'active' ? 'security' : ''}`}>{t(`member.statuses.${row.status}`)}</span></td>
                    <td><Meter value={row.progress ?? null} locale={locale} /></td>
                    <td>{row.quiz_percent === null ? <span className="admin-sub-inline">—</span> : <span dir="ltr">{formatPercent(row.quiz_percent, locale)}</span>}</td>
                    <td className="admin-num" dir="ltr">{count(row.streamed_minutes)}</td>
                    <td>{row.certificate_number ? <code className="admin-code" dir="ltr">{row.certificate_number}</code> : <span className="admin-sub-inline">—</span>}</td>
                    <td>
                      <span>{formatDate(row.granted_at, locale)}</span>
                      <span className="admin-sub">{t('member.until', { date: formatDate(row.expires_at, locale) })}</span>
                    </td>
                    <td>
                      {member && ['active', 'completed'].includes(row.status) && (
                        <ReleaseSeatButton org={orgId} course={row.course_id} user={userId} title={row.course_title} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
