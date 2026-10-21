import { getTranslations } from 'next-intl/server'
import { ArrowUpRight, Info } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCount, formatMoney, ratio, type AnalyticsRange } from '../analytics'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { CourseStatusBadge } from './admin-course-bits'
import { AnalyticsToolbar, Meter } from './analytics-bits'

export async function AnalyticsCoursesPage({ locale, range }: { locale: Locale; range: AnalyticsRange }) {
  const t = await getTranslations({ locale, namespace: 'admin.analytics' })
  const admin = await getTranslations({ locale, namespace: 'admin' })
  const { data, error } = await (await createClient()).rpc('admin_analytics_courses', { p_days: range, p_locale: locale })
  if (error?.code === '42501') return <AdminDenied />
  if (error) throw new Error('Could not load course analytics.')
  const rows = data ?? []
  const count = (value: number) => formatCount(value, locale)

  return (
    <>
      <AdminPageHeader eyebrow={t('title')} title={t('courses.title')} description={t('courses.subtitle')} />
      <AnalyticsToolbar view="courses" range={range} rangeHref="/admin/analytics/courses" />
      <section className="panel admin-card" aria-labelledby="analytics-course-table">
        <div className="admin-card-head">
          <h2 id="analytics-course-table">{t('courses.table')}</h2>
          <span className="admin-count" dir="ltr">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty">{t('courses.empty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="analytics-course-table">
            <table className="admin-table admin-table-wide">
              <thead>
                <tr>
                  <th scope="col">{t('courses.course')}</th>
                  <th scope="col">{t('courses.learners')}</th>
                  <th scope="col">{t('courses.access')}</th>
                  <th scope="col">{t('courses.completion')}</th>
                  <th scope="col">{t('courses.progress')}</th>
                  <th scope="col">{t('courses.minutes')}</th>
                  <th scope="col">{t('courses.quiz')}</th>
                  <th scope="col">{t('courses.rating')}</th>
                  <th scope="col">{t('courses.revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.course_id}>
                    <td>
                      <Link className="admin-list-main" href={`/admin/analytics/courses/${row.course_id}?range=${range}`}>
                        <strong dir="auto">{row.title}</strong>
                        <span className="admin-ltr" dir="ltr">{row.slug}</span>
                      </Link>
                      {row.status !== 'published' && <CourseStatusBadge status={row.status} />}
                    </td>
                    <td className="admin-num">
                      <strong dir="ltr">{count(row.enrollments)}</strong>
                      <span className="admin-sub">{t('courses.newInRange', { count: row.enrollments_new })}</span>
                    </td>
                    <td className="admin-sub">
                      {t('courses.accessMix', { free: row.free_enrollments, paid: row.paid_enrollments, admin: row.admin_enrollments })}
                    </td>
                    <td>
                      <Meter value={ratio(row.cohort_completed, row.cohort_size)} locale={locale} />
                      <span className="admin-sub">{t('courses.cohort', { completed: row.cohort_completed, size: row.cohort_size })}</span>
                    </td>
                    <td><Meter value={row.average_progress ?? null} locale={locale} /></td>
                    <td className="admin-num">
                      <strong dir="ltr">{count(row.streamed_minutes)}</strong>
                      <span className="admin-sub">{t('uniqueMinutes', { count: row.watched_minutes })}</span>
                    </td>
                    <td>
                      <Meter value={ratio(row.quiz_passed, row.quiz_attempts)} locale={locale} />
                      <span className="admin-sub">{t('courses.attempts', { count: row.quiz_attempts })}</span>
                    </td>
                    <td className="admin-num">
                      {row.reviews > 0 ? (
                        <>
                          <strong dir="ltr">{`${row.rating} / 5`}</strong>
                          <span className="admin-sub">{t('courses.reviews', { count: row.reviews })}</span>
                        </>
                      ) : (
                        <span className="admin-sub-inline">—</span>
                      )}
                    </td>
                    <td className="admin-num" dir="ltr">{row.price_minor === 0 ? admin('courses.free') : formatMoney(row.revenue_minor, 'EGP', locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <aside className="admin-note">
        <Info size={18} aria-hidden="true" />
        <p>
          {t('courses.note')}{' '}
          <Link className="admin-text-link" href="/admin/courses">
            {t('courses.manage')}
            <ArrowUpRight size={14} aria-hidden="true" className="admin-flip" />
          </Link>
        </p>
      </aside>
    </>
  )
}
