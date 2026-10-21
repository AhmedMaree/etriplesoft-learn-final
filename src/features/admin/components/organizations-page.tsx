import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Info } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreateOrganizationForm, OrganizationStatusButton } from '@/features/organizations/components/org-forms'
import { OrgManagement, type OrgTab } from '@/features/organizations/components/org-sections'
import { formatCount, formatMoney, formatPercent } from '../analytics'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { Kpi, Meter } from './analytics-bits'

function formatDate(value: string | null, locale: Locale) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', { dateStyle: 'medium', timeZone: 'Africa/Cairo' }).format(new Date(value))
}

const DAY_MS = 24 * 60 * 60 * 1000

type RiskRow = { status: string; next_expiry: string | null; seats_total: number; seats_used: number }

// Renewal risk: a license ends within 60 days while fewer than half of the seats are in use.
function renewalRisk<T extends RiskRow>(rows: T[]): T[] {
  const now = Date.now()
  return rows.filter(
    (row) =>
      row.status === 'active' && row.next_expiry && new Date(row.next_expiry).getTime() - now < 60 * DAY_MS &&
      row.seats_total > 0 && row.seats_used / row.seats_total < 0.5,
  )
}

/** B2B overview: every organization with seats, engagement, renewal timing and revenue. */
export async function AdminOrganizationsPage({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const admin = await getTranslations({ locale, namespace: 'admin' })
  const supabase = await createClient()
  const [orgs, universities, companies] = await Promise.all([
    supabase.rpc('admin_list_organizations'),
    supabase.rpc('admin_list_institutions', { p_kind: 'university' }),
    supabase.rpc('admin_list_institutions', { p_kind: 'company' }),
  ])
  if (orgs.error?.code === '42501') return <AdminDenied />
  if (orgs.error) throw new Error('Could not load organizations.')
  const rows = orgs.data ?? []
  const count = (value: number) => formatCount(value, locale)
  const active = rows.filter((row) => row.status === 'active')
  const seatsTotal = active.reduce((sum, row) => sum + row.seats_total, 0)
  const seatsUsed = active.reduce((sum, row) => sum + row.seats_used, 0)
  const atRisk = renewalRisk(rows)
  const option = (row: { id: string; name_en: string; name_ar: string | null }) => ({ id: row.id, label: locale === 'ar' && row.name_ar ? row.name_ar : row.name_en })

  return (
    <>
      <AdminPageHeader eyebrow={admin('nav.groups.learners')} title={t('admin.title')} description={t('admin.subtitle')} />
      <section className="admin-kpis" aria-label={t('summary')}>
        <Kpi label={t('admin.kpis.organizations')} value={count(active.length)} detail={t('admin.kpis.organizationsDetail', { count: rows.length - active.length })} />
        <Kpi
          label={t('kpis.seats')}
          value={`${count(seatsUsed)} / ${count(seatsTotal)}`}
          detail={seatsTotal ? t('admin.kpis.utilization', { value: formatPercent(Math.round((seatsUsed / seatsTotal) * 100), locale) }) : t('kpis.seatsDetail')}
        />
        <Kpi label={t('admin.kpis.members')} value={count(active.reduce((sum, row) => sum + row.members, 0))} detail={t('admin.kpis.active30', { count: active.reduce((sum, row) => sum + row.active_members_30d, 0) })} />
        <Kpi label={t('admin.kpis.revenue')} value={formatMoney(rows.reduce((sum, row) => sum + row.revenue_minor, 0), 'EGP', locale)} detail={t('admin.kpis.revenueDetail')} />
      </section>

      {atRisk.length > 0 && (
        <aside className="admin-note admin-note-warn">
          <Info size={18} aria-hidden="true" />
          <p>{t('admin.atRisk', { count: atRisk.length, names: atRisk.map((row) => row.name).join(', ') })}</p>
        </aside>
      )}

      <section className="panel admin-card" aria-labelledby="org-list">
        <div className="admin-card-head">
          <h2 id="org-list">{t('admin.listTitle')}</h2>
          <span className="admin-count" dir="ltr">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty">{t('admin.empty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="org-list">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th scope="col">{t('admin.organization')}</th>
                  <th scope="col">{t('kpis.members')}</th>
                  <th scope="col">{t('kpis.seats')}</th>
                  <th scope="col">{t('admin.nextExpiry')}</th>
                  <th scope="col">{t('admin.active30')}</th>
                  <th scope="col">{t('kpis.progress')}</th>
                  <th scope="col">{t('kpis.completions')}</th>
                  <th scope="col">{t('admin.revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="admin-list-main" href={`/admin/organizations/${row.id}`}>
                        <strong dir="auto">{row.name}</strong>
                        <span className="admin-sub">{t(`kinds.${row.kind}`)}{row.institution_name ? ` · ${row.institution_name}` : ''}</span>
                      </Link>
                      {row.status !== 'active' && <span className="admin-tag danger">{t('admin.suspended')}</span>}
                    </td>
                    <td className="admin-num">
                      <strong dir="ltr">{count(row.members)}</strong>
                      <span className="admin-sub">{t('admin.membersDetail', { managers: row.managers, pending: row.pending_invitations })}</span>
                    </td>
                    <td>
                      <Meter value={row.seats_total ? Math.round((row.seats_used / row.seats_total) * 100) : null} locale={locale} />
                      <span className="admin-sub" dir="ltr">{`${count(row.seats_used)} / ${count(row.seats_total)}`}</span>
                    </td>
                    <td>{formatDate(row.next_expiry, locale)}</td>
                    <td className="admin-num" dir="ltr">{count(row.active_members_30d)}</td>
                    <td><Meter value={row.average_progress ?? null} locale={locale} /></td>
                    <td className="admin-num" dir="ltr">{count(row.completions)}</td>
                    <td className="admin-num" dir="ltr">{formatMoney(row.revenue_minor, 'EGP', locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel admin-card" aria-labelledby="org-create">
        <h2 id="org-create">{t('admin.createTitle')}</h2>
        <p className="admin-hint">{t('admin.createHint')}</p>
        <CreateOrganizationForm universities={(universities.data ?? []).map(option)} companies={(companies.data ?? []).map(option)} />
      </section>
    </>
  )
}

export async function AdminOrganizationPage({ locale, orgId, tab }: { locale: Locale; orgId: string; tab: OrgTab }) {
  const t = await getTranslations({ locale, namespace: 'organizations' })
  const { data, error } = await (await createClient()).rpc('org_get', { p_org: orgId })
  if (error?.code === '42501') return <AdminDenied />
  if (error?.code === 'P0002') notFound()
  if (error) throw new Error('Could not load the organization.')
  const org = data?.[0]
  if (!org) notFound()
  return (
    <>
      <Link className="admin-back" href="/admin/organizations">
        <ArrowLeft size={16} aria-hidden="true" className="admin-flip" />
        {t('admin.back')}
      </Link>
      <AdminPageHeader
        eyebrow={t(`kinds.${org.kind}`)}
        title={<span dir="auto">{org.name}</span>}
        description={org.status === 'active' ? t('admin.detailSubtitle') : t('admin.suspendedSubtitle')}
        actions={<OrganizationStatusButton org={org.id} status={org.status} name={org.name} />}
      />
      <OrgManagement
        locale={locale}
        orgId={org.id}
        tab={tab === 'buy' ? 'overview' : tab}
        mode="admin"
        links={{
          tab: (value) => `/admin/organizations/${org.id}?tab=${value}`,
          member: (userId) => `/admin/organizations/${org.id}/members/${userId}`,
          back: `/admin/organizations/${org.id}?tab=members`,
        }}
      />
    </>
  )
}
