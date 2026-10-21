import { getTranslations } from 'next-intl/server'
import { Search } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { getPathname, Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PAGE_SIZE } from '../roles'
import { LEARNER_SEGMENTS, formatCount, formatLongDay, type LearnerSegment } from '../analytics'
import { formatAdminDate } from '../format'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { AdminPager } from './admin-pager'
import { AnalyticsToolbar, Meter } from './analytics-bits'

const segmentTone: Record<string, string> = { paid: 'success', organization: 'commerce', free: 'security', complimentary: 'content', none: '' }

export async function AnalyticsLearnersPage({ locale, page, search, segment }: {
  locale: Locale
  page: number
  search: string
  segment: LearnerSegment | undefined
}) {
  const t = await getTranslations({ locale, namespace: 'admin.analytics' })
  const admin = await getTranslations({ locale, namespace: 'admin' })
  const { data, error } = await (await createClient()).rpc('admin_analytics_learners', {
    p_search: search,
    p_segment: segment ?? '',
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  })
  if (error?.code === '42501') return <AdminDenied />
  if (error) throw new Error('Could not load learners.')
  const rows = data ?? []
  const total = rows[0]?.total_count ?? 0
  const count = (value: number) => formatCount(value, locale)
  // Filters to keep while paging or switching segments.
  const query = (next: { segment?: LearnerSegment }) => ({
    ...(search ? { q: search } : {}),
    ...(next.segment ? { segment: next.segment } : {}),
  })

  return (
    <>
      <AdminPageHeader eyebrow={t('title')} title={t('learners.title')} description={t('learners.subtitle')} />
      <AnalyticsToolbar view="learners" range={30} />
      <section className="panel admin-card" aria-labelledby="analytics-learners">
        <div className="admin-card-head">
          <h2 id="analytics-learners">{t('learners.table')}</h2>
          <span className="admin-count" dir="ltr">{total}</span>
        </div>
        <form className="admin-analytics-search" role="search" method="get" action={getPathname({ locale, href: '/admin/analytics/learners' })}>
          <label className="admin-visually-hidden" htmlFor="analytics-learner-search">{t('learners.search')}</label>
          <input id="analytics-learner-search" type="search" name="q" defaultValue={search} maxLength={120} placeholder={t('learners.searchPlaceholder')} />
          {segment && <input type="hidden" name="segment" value={segment} />}
          <button className="btn outline" type="submit">
            <Search size={16} aria-hidden="true" />
            {t('learners.searchAction')}
          </button>
        </form>
        <nav className="admin-tabs" aria-label={t('learners.segmentFilter')}>
          <Link href={{ pathname: '/admin/analytics/learners', query: query({}) }} aria-current={segment ? undefined : 'page'}>
            {t('learners.allSegments')}
          </Link>
          {LEARNER_SEGMENTS.map((value) => (
            <Link key={value} href={{ pathname: '/admin/analytics/learners', query: query({ segment: value }) }} aria-current={value === segment ? 'page' : undefined}>
              {t(`segments.${value}`)}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? (
          <p className="admin-empty">{search || segment ? t('learners.noMatches') : t('learners.empty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="analytics-learners">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th scope="col">{t('learners.learner')}</th>
                  <th scope="col">{t('learners.profile')}</th>
                  <th scope="col">{t('learners.access')}</th>
                  <th scope="col">{t('learners.courses')}</th>
                  <th scope="col">{t('learners.progress')}</th>
                  <th scope="col">{t('learners.minutes')}</th>
                  <th scope="col">{t('learners.lastActive')}</th>
                  <th scope="col">{t('learners.joined')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id}>
                    <td>
                      <strong dir="auto">{row.display_name || admin('table.unnamed')}</strong>
                      <span className="admin-ltr" dir="ltr">{row.email}</span>
                    </td>
                    <td>
                      <span>{t(`types.${row.learner_type ?? 'not_onboarded'}`)}</span>
                      {row.institution && <span className="admin-sub" dir="auto">{row.institution}</span>}
                    </td>
                    <td><span className={`admin-tag ${segmentTone[row.segment] ?? ''}`}>{t(`segments.${row.segment}`)}</span></td>
                    <td className="admin-num">
                      <span dir="ltr">{`${count(row.completed)} / ${count(row.enrollments)}`}</span>
                      <span className="admin-sub">{t('learners.completedOf')}</span>
                    </td>
                    <td><Meter value={row.average_progress ?? null} locale={locale} /></td>
                    <td className="admin-num">
                      <strong dir="ltr">{count(row.streamed_minutes)}</strong>
                      <span className="admin-sub">{t('uniqueMinutes', { count: row.watched_minutes })}</span>
                    </td>
                    <td>{row.last_active ? formatLongDay(row.last_active, locale) : <span className="admin-sub-inline">{t('learners.never')}</span>}</td>
                    <td>{formatAdminDate(row.joined_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPager href="/admin/analytics/learners" page={page} total={total} query={query({ segment })} />
      </section>
    </>
  )
}
