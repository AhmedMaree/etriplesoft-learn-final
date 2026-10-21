import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ArrowLeft, Info } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCount, formatMoney, formatPercent, ratio, type AnalyticsRange } from '../analytics'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { AnalyticsToolbar, Kpi, Meter } from './analytics-bits'

export async function AnalyticsCoursePage({ locale, range, courseId }: { locale: Locale; range: AnalyticsRange; courseId: string }) {
  const t = await getTranslations({ locale, namespace: 'admin.analytics' })
  const supabase = await createClient()
  const [courses, lessons] = await Promise.all([
    supabase.rpc('admin_analytics_courses', { p_days: range, p_locale: locale }),
    supabase.rpc('admin_analytics_course_lessons', { p_course_id: courseId, p_locale: locale }),
  ])
  if (courses.error?.code === '42501' || lessons.error?.code === '42501') return <AdminDenied />
  if (lessons.error?.code === 'P0002') notFound()
  if (courses.error || lessons.error) throw new Error('Could not load course analytics.')
  // Draft courses have no learners and are not listed.
  const course = (courses.data ?? []).find((row) => row.course_id === courseId)
  if (!course) notFound()

  const rows = lessons.data ?? []
  const completion = ratio(course.cohort_completed, course.cohort_size)
  const count = (value: number) => formatCount(value, locale)
  // The lesson that loses the most learners compared with the one before it.
  let dropIndex = -1
  let dropSize = 0
  rows.forEach((row, index) => {
    const drop = index > 0 ? rows[index - 1].completed - row.completed : 0
    if (drop > dropSize) {
      dropSize = drop
      dropIndex = index
    }
  })

  return (
    <>
      <Link className="admin-back" href={`/admin/analytics/courses?range=${range}`}>
        <ArrowLeft size={16} aria-hidden="true" className="admin-flip" />
        {t('course.back')}
      </Link>
      <AdminPageHeader
        eyebrow={t('courses.title')}
        title={<span dir="auto">{course.title}</span>}
        description={t('course.subtitle')}
        actions={<Link className="btn outline" href={`/admin/courses/${courseId}`}>{t('course.edit')}</Link>}
      />
      <AnalyticsToolbar view="courses" range={range} rangeHref={`/admin/analytics/courses/${courseId}`} />

      <section className="admin-kpis" aria-label={t('kpis.label')}>
        <Kpi label={t('course.learners')} value={count(course.enrollments)} detail={t('courses.newInRange', { count: course.enrollments_new })} />
        <Kpi
          label={t('course.completion')}
          value={completion === null ? '—' : formatPercent(completion, locale)}
          detail={t('courses.cohort', { completed: course.cohort_completed, size: course.cohort_size })}
        />
        <Kpi
          label={t('course.progress')}
          value={course.average_progress === null ? '—' : formatPercent(course.average_progress, locale)}
          detail={t('course.activeLearners', { count: course.active_learners })}
        />
        <Kpi
          label={t('course.revenue')}
          value={formatMoney(course.revenue_minor, 'EGP', locale)}
          detail={t('course.minutes', { count: course.streamed_minutes })}
        />
      </section>

      <section className="panel admin-card" aria-labelledby="analytics-lessons">
        <div className="admin-card-head">
          <h2 id="analytics-lessons">{t('course.funnel')}</h2>
          <span className="admin-count" dir="ltr">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty">{t('course.noLessons')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="analytics-lessons">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('course.lesson')}</th>
                  <th scope="col">{t('course.started')}</th>
                  <th scope="col">{t('course.completed')}</th>
                  <th scope="col">{t('course.watch')}</th>
                  <th scope="col">{t('course.streamed')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.lesson_id}>
                    <td>
                      <strong dir="auto">
                        <span className="admin-sub-inline" dir="ltr">{`${row.module_position}.${row.lesson_position} `}</span>
                        {row.title || t('course.untitled')}
                      </strong>
                      <span className="admin-sub">
                        {t(`course.types.${row.lesson_type}`)}
                        {!row.is_required && ` · ${t('course.optional')}`}
                      </span>
                      {index === dropIndex && <span className="admin-tag commerce">{t('course.biggestDrop', { count: dropSize })}</span>}
                    </td>
                    <td>
                      <Meter value={ratio(row.started, row.learners)} locale={locale} />
                      <span className="admin-sub" dir="ltr">{`${count(row.started)} / ${count(row.learners)}`}</span>
                    </td>
                    <td>
                      <Meter value={ratio(row.completed, row.learners)} locale={locale} />
                      <span className="admin-sub" dir="ltr">{`${count(row.completed)} / ${count(row.learners)}`}</span>
                    </td>
                    <td>{row.lesson_type === 'video' ? <Meter value={row.average_watch_percent ?? null} locale={locale} /> : <span className="admin-sub-inline">—</span>}</td>
                    <td className="admin-num" dir="ltr">{row.lesson_type === 'video' ? count(row.streamed_minutes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <aside className="admin-note">
        <Info size={18} aria-hidden="true" />
        <p>{t('course.note')}</p>
      </aside>
    </>
  )
}
