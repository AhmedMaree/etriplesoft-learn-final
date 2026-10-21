import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { ANALYTICS_RANGES, formatCount, formatDay, formatMoney, formatPercent, type AnalyticsRange } from '../analytics'

type AnalyticsView = 'overview' | 'courses' | 'learners'

// View tabs plus, where the view is time-bound, the range picker: one filter row above the figures.
export async function AnalyticsToolbar({ view, range, rangeHref }: {
  view: AnalyticsView
  range: AnalyticsRange
  // Path the range links point to; omit for views that are not time-bound.
  rangeHref?: string
}) {
  const t = await getTranslations('admin.analytics')
  const views: { key: AnalyticsView; href: string }[] = [
    { key: 'overview', href: '/admin/analytics' },
    { key: 'courses', href: '/admin/analytics/courses' },
    { key: 'learners', href: '/admin/analytics/learners' },
  ]
  return (
    <div className="admin-analytics-bar">
      <nav className="admin-tabs" aria-label={t('tabs.label')}>
        {views.map(({ key, href }) => (
          <Link key={key} href={key === 'learners' ? href : `${href}?range=${range}`} aria-current={key === view ? 'page' : undefined}>
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>
      {rangeHref && (
        <nav className="admin-tabs" aria-label={t('ranges.label')}>
          {ANALYTICS_RANGES.map((value) => (
            <Link key={value} href={`${rangeHref}?range=${value}`} aria-current={value === range ? 'page' : undefined}>
              {t(`ranges.${value}`)}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

/** Change against the previous period of the same length; an arrow and sign carry the direction, not color alone. */
export async function Delta({ value, locale }: { value: number | null; locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'admin.analytics' })
  if (value === null) return <span className="admin-delta">{t('delta.none')}</span>
  const tone = value > 0 ? 'up' : value < 0 ? 'down' : ''
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  return (
    <span className={`admin-delta ${tone}`}>
      <Icon size={14} aria-hidden="true" />
      <span dir="ltr">{`${value > 0 ? '+' : ''}${formatPercent(value, locale)}`}</span>
      <span>{t('delta.vsPrevious')}</span>
    </span>
  )
}

export function Kpi({ label, value, detail, delta }: { label: string; value: string; detail?: ReactNode; delta?: ReactNode }) {
  return (
    <article className="admin-kpi">
      <p className="admin-kpi-label">{label}</p>
      <p className="admin-kpi-value" dir="ltr">{value}</p>
      {delta}
      {detail && <p className="admin-kpi-detail">{detail}</p>}
    </article>
  )
}

// Rounds an axis maximum up to 1, 2, 2.5 or 5 times a power of ten.
function niceMax(value: number): number {
  if (value <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 2.5, 5, 10].find((step) => step * magnitude >= value) ?? 10) * magnitude
}

/**
 * Single-series column chart over time. Time always runs left to right (dir="ltr"), also in Arabic. Each column
 * carries a native tooltip and the full series is available as a table, so the chart is never the only source.
 */
export async function TrendChart({ title, total, points, bucket, locale, currency }: {
  title: string
  total: number
  points: { date: string; value: number }[]
  bucket: 'day' | 'week'
  locale: Locale
  // Present for money series (minor units); counts otherwise.
  currency?: string
}) {
  const t = await getTranslations({ locale, namespace: 'admin.analytics' })
  const format = (value: number) => (currency ? formatMoney(value, currency, locale) : formatCount(value, locale))
  // A year of weekly buckets spans two calendar years, so week labels carry the year.
  const label = (date: string) =>
    bucket === 'week' ? t('chart.weekOf', { date: formatDay(date, locale, { withYear: true }) }) : formatDay(date, locale)
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)))
  const ticks = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])].filter((index) => points[index])
  const first = points[0]
  const last = points.at(-1)

  return (
    <figure className="panel admin-card admin-trend">
      <figcaption className="admin-trend-head">
        <span>{title}</span>
        <strong dir="ltr">{format(total)}</strong>
      </figcaption>
      <div className="admin-trend-body" dir="ltr">
        <div className="admin-trend-axis" aria-hidden="true">
          <span>{format(max)}</span>
          <span>{format(0)}</span>
        </div>
        <div
          className={`admin-trend-plot ${points.length > 45 ? 'dense' : ''}`}
          role="img"
          aria-label={first && last ? t('chart.summary', { title, total: format(total), from: label(first.date), to: label(last.date) }) : title}
        >
          {points.map((point) => (
            <span key={point.date} className="admin-trend-col" title={`${label(point.date)}: ${format(point.value)}`}>
              {point.value > 0 && max > 0 && (
                <span className="admin-trend-bar" style={{ blockSize: `max(2px, ${(point.value / max) * 100}%)` }} />
              )}
            </span>
          ))}
        </div>
        <div className="admin-trend-ticks" aria-hidden="true">
          {ticks.map((index) => (
            <span key={index}>{label(points[index].date)}</span>
          ))}
        </div>
      </div>
      <details className="admin-trend-data">
        <summary>{t('chart.showData')}</summary>
        <div className="admin-table-wrap" tabIndex={0} role="region" aria-label={title}>
          <table className="admin-table admin-table-compact">
            <thead>
              <tr>
                <th scope="col">{bucket === 'week' ? t('chart.week') : t('chart.day')}</th>
                <th scope="col">{title}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <td>{label(point.date)}</td>
                  <td className="admin-num" dir="ltr">{format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}

/** Ranked horizontal bars with direct value labels; optionally shows each item's share of the total. */
export function BarList({ items, locale, showShare = false, empty }: {
  items: { key: string; label: ReactNode; value: number }[]
  locale: Locale
  showShare?: boolean
  empty: string
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const max = Math.max(0, ...items.map((item) => item.value))
  if (total === 0) return <p className="admin-empty">{empty}</p>
  return (
    <ul className="admin-barlist">
      {items.map((item) => (
        <li key={item.key}>
          <span className="admin-barlist-label">{item.label}</span>
          <span className="admin-barlist-value" dir="ltr">
            {formatCount(item.value, locale)}
            {showShare && <span className="admin-sub-inline">{` · ${formatPercent((item.value / total) * 100, locale)}`}</span>}
          </span>
          <span className="admin-barlist-track" aria-hidden="true">
            {item.value > 0 && <span style={{ inlineSize: `max(4px, ${(item.value / max) * 100}%)` }} />}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Inline percentage meter for table cells; shows a dash when there is no value. */
export function Meter({ value, locale }: { value: number | null; locale: Locale }) {
  if (value === null) return <span className="admin-sub-inline">—</span>
  return (
    <span className="admin-pct">
      <span className="admin-pct-track" aria-hidden="true">
        <span style={{ inlineSize: `${Math.min(100, Math.max(0, value))}%` }} />
      </span>
      <span dir="ltr">{formatPercent(value, locale)}</span>
    </span>
  )
}
