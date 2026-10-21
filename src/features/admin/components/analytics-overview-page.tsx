import { getTranslations } from 'next-intl/server'
import { Info, TriangleAlert } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ENROLLMENT_SOURCES,
  LEARNER_SEGMENTS,
  LEARNER_TYPES,
  change,
  formatCount,
  formatMoney,
  formatPercent,
  parseOverview,
  type AnalyticsRange,
  type NamedCount,
} from '../analytics'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { AnalyticsToolbar, BarList, Delta, Kpi, TrendChart } from './analytics-bits'

export async function AnalyticsOverviewPage({ locale, range }: { locale: Locale; range: AnalyticsRange }) {
  const t = await getTranslations({ locale, namespace: 'admin.analytics' })
  const admin = await getTranslations({ locale, namespace: 'admin' })
  const { data, error } = await (await createClient()).rpc('admin_analytics_overview', { p_days: range })
  if (error?.code === '42501') return <AdminDenied />
  if (error || data === null) throw new Error('Could not load analytics.')

  const o = parseOverview(data)
  const count = (value: number) => formatCount(value, locale)
  const money = (minor: number) => formatMoney(minor, o.revenue.currency, locale)
  const series = (key: 'signups' | 'active' | 'enrollments' | 'revenue' | 'streamed') => o.series.map((point) => ({ date: point.date, value: point[key] }))
  const averageOrder = o.revenue.paidOrders ? Math.round(o.revenue.gross / o.revenue.paidOrders) : 0
  // Linked institutions show their name in the page language; unlinked names show as typed, marked for review.
  const institutionItems = (items: NamedCount[]) =>
    items.map((item) => ({
      key: item.name,
      label: (
        <>
          <span dir="auto">{locale === 'ar' && item.nameAr ? item.nameAr : item.name}</span>
          {!item.matched && <span className="admin-tag">{t('institutionUnlinked')}</span>}
        </>
      ),
      value: item.learners,
    }))
  const unlinked = o.institutions.universityUnmatched + o.institutions.companyUnmatched

  return (
    <>
      <AdminPageHeader eyebrow={admin('nav.groups.general')} title={t('title')} description={t('subtitle')} />
      <AnalyticsToolbar view="overview" range={range} rangeHref="/admin/analytics" />

      <section className="admin-kpis" aria-label={t('kpis.label')}>
        <Kpi
          label={t('kpis.learners')}
          value={count(o.users.total)}
          detail={t('kpis.learnersDetail', { count: o.users.new })}
          delta={<Delta value={change(o.users.new, o.users.newPrev)} locale={locale} />}
        />
        <Kpi
          label={t('kpis.active')}
          value={count(o.activity.range)}
          detail={t('kpis.activeDetail', { today: o.activity.today, week: o.activity.week, month: o.activity.month })}
          delta={<Delta value={change(o.activity.range, o.activity.rangePrev)} locale={locale} />}
        />
        <Kpi
          label={t('kpis.enrollments')}
          value={count(o.learning.enrollments)}
          detail={t('kpis.enrollmentsDetail', { count: o.learning.activeEnrollments })}
          delta={<Delta value={change(o.learning.enrollments, o.learning.enrollmentsPrev)} locale={locale} />}
        />
        <Kpi
          label={t('kpis.completions')}
          value={count(o.learning.completions)}
          detail={t('kpis.completionsDetail', { count: o.learning.certificates })}
          delta={<Delta value={change(o.learning.completions, o.learning.completionsPrev)} locale={locale} />}
        />
        <Kpi
          label={t('kpis.revenue')}
          value={money(o.revenue.net)}
          detail={t('kpis.revenueDetail', { gross: money(o.revenue.gross), refunds: money(o.revenue.refunds), b2b: money(o.revenue.organizationNet) })}
          delta={<Delta value={change(o.revenue.net, o.revenue.netPrev)} locale={locale} />}
        />
        <Kpi
          label={t('kpis.orders')}
          value={count(o.revenue.paidOrders)}
          detail={t('kpis.ordersDetail', { average: money(averageOrder), discounts: money(o.revenue.discounts) })}
        />
        <Kpi
          label={t('kpis.progress')}
          value={o.learning.averageProgress === null ? '—' : formatPercent(o.learning.averageProgress, locale)}
          detail={t('kpis.progressDetail')}
        />
        <Kpi
          label={t('kpis.streamed')}
          value={count(o.learning.streamedMinutes)}
          detail={t('kpis.streamedDetail', { unique: count(o.learning.watchedMinutes) })}
          delta={<Delta value={change(o.learning.streamedMinutes, o.learning.streamedMinutesPrev)} locale={locale} />}
        />
      </section>

      {o.users.atRisk > 0 && (
        <aside className="admin-note admin-note-warn">
          <TriangleAlert size={18} aria-hidden="true" />
          <p>
            {t('atRisk', { count: o.users.atRisk })}{' '}
            <Link className="admin-text-link" href="/admin/analytics/learners">{t('atRiskLink')}</Link>
          </p>
        </aside>
      )}

      <section className="admin-analytics-grid" aria-label={t('trends')}>
        <TrendChart title={t('series.signups')} total={o.users.new} points={series('signups')} bucket={o.range.bucket} locale={locale} />
        <TrendChart title={t('series.active')} total={o.activity.range} points={series('active')} bucket={o.range.bucket} locale={locale} />
        <TrendChart title={t('series.enrollments')} total={o.learning.enrollments} points={series('enrollments')} bucket={o.range.bucket} locale={locale} />
        <TrendChart
          title={t('series.revenue')}
          total={o.revenue.net}
          points={series('revenue')}
          bucket={o.range.bucket}
          locale={locale}
          currency={o.revenue.currency}
        />
        <TrendChart title={t('series.streamed')} total={o.learning.streamedMinutes} points={series('streamed')} bucket={o.range.bucket} locale={locale} />
      </section>

      <div className="admin-analytics-grid three">
        <section className="panel admin-card" aria-labelledby="analytics-segments">
          <div className="admin-card-head"><h2 id="analytics-segments">{t('breakdowns.segments')}</h2></div>
          <BarList
            locale={locale}
            showShare
            empty={t('empty')}
            items={LEARNER_SEGMENTS.map((key) => ({ key, label: t(`segments.${key}`), value: o.users.bySegment[key] ?? 0 }))}
          />
        </section>
        <section className="panel admin-card" aria-labelledby="analytics-types">
          <div className="admin-card-head"><h2 id="analytics-types">{t('breakdowns.types')}</h2></div>
          <BarList
            locale={locale}
            showShare
            empty={t('empty')}
            items={LEARNER_TYPES.map((key) => ({ key, label: t(`types.${key}`), value: o.users.byType[key] ?? 0 }))}
          />
        </section>
        <section className="panel admin-card" aria-labelledby="analytics-sources">
          <div className="admin-card-head"><h2 id="analytics-sources">{t('breakdowns.sources')}</h2></div>
          <BarList
            locale={locale}
            showShare
            empty={t('emptyRange')}
            items={ENROLLMENT_SOURCES.map((key) => ({ key, label: t(`sources.${key}`), value: o.learning.bySource[key] ?? 0 }))}
          />
        </section>
      </div>

      <div className="admin-analytics-grid three">
        <section className="panel admin-card" aria-labelledby="analytics-universities">
          <div className="admin-card-head">
            <h2 id="analytics-universities">{t('breakdowns.universities')}</h2>
            <span className="admin-count" dir="ltr">{o.institutions.universityCount}</span>
          </div>
          <BarList
            locale={locale}
            empty={t('empty')}
            items={institutionItems(o.institutions.universities)}
          />
        </section>
        <section className="panel admin-card" aria-labelledby="analytics-companies">
          <div className="admin-card-head">
            <h2 id="analytics-companies">{t('breakdowns.companies')}</h2>
            <span className="admin-count" dir="ltr">{o.institutions.companyCount}</span>
          </div>
          <BarList
            locale={locale}
            empty={t('empty')}
            items={institutionItems(o.institutions.companies)}
          />
        </section>
        <section className="panel admin-card" aria-labelledby="analytics-checkout">
          <div className="admin-card-head"><h2 id="analytics-checkout">{t('breakdowns.checkout')}</h2></div>
          <BarList
            locale={locale}
            empty={t('emptyRange')}
            items={[
              { key: 'created', label: t('checkout.created'), value: o.revenue.ordersCreated },
              { key: 'paid', label: t('checkout.paid'), value: o.revenue.paidOrders },
              { key: 'abandoned', label: t('checkout.abandoned'), value: o.revenue.ordersAbandoned },
            ]}
          />
        </section>
      </div>

      {unlinked > 0 && (
        <aside className="admin-note">
          <Info size={18} aria-hidden="true" />
          <p>
            {t('unlinkedNames', { count: unlinked })}{' '}
            <Link className="admin-text-link" href="/admin/institutions">{t('unlinkedLink')}</Link>
          </p>
        </aside>
      )}

      <aside className="admin-note">
        <Info size={18} aria-hidden="true" />
        <p>{t('definitions')}</p>
      </aside>
    </>
  )
}
