import type { Locale } from '@/i18n/config'
import type { Json } from '@/types/database'

// Ranges offered by the analytics RPCs (days); a year is bucketed by week, shorter ranges by day.
export const ANALYTICS_RANGES = [7, 30, 90, 365] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export const LEARNER_SEGMENTS = ['paid', 'organization', 'free', 'complimentary', 'none'] as const
export type LearnerSegment = (typeof LEARNER_SEGMENTS)[number]

export const LEARNER_TYPES = ['student', 'professional', 'company_invited', 'not_onboarded'] as const
export const ENROLLMENT_SOURCES = ['free', 'paid', 'organization', 'admin'] as const

export function parseRange(value: string | undefined): AnalyticsRange {
  return ANALYTICS_RANGES.find((range) => String(range) === value) ?? 30
}

export function parseSegment(value: string | undefined): LearnerSegment | undefined {
  return LEARNER_SEGMENTS.find((segment) => segment === value)
}

export function parseSearch(value: string | undefined): string {
  return (value ?? '').trim().slice(0, 120)
}

export type TrendPoint = { date: string; signups: number; active: number; enrollments: number; revenue: number; streamed: number }
// matched: the name is linked to a known institution (nameAr is that institution's Arabic name, if any).
export type NamedCount = { name: string; nameAr: string; matched: boolean; learners: number }

export type AnalyticsOverview = {
  range: { days: number; start: string; end: string; bucket: 'day' | 'week' }
  users: { total: number; new: number; newPrev: number; byType: Record<string, number>; bySegment: Record<string, number>; atRisk: number }
  activity: { today: number; week: number; month: number; range: number; rangePrev: number }
  learning: {
    enrollments: number
    enrollmentsPrev: number
    bySource: Record<string, number>
    completions: number
    completionsPrev: number
    certificates: number
    activeEnrollments: number
    organizations: number
    averageProgress: number | null
    watchedMinutes: number
    streamedMinutes: number
    streamedMinutesPrev: number
  }
  revenue: {
    currency: string
    gross: number
    refunds: number
    net: number
    netPrev: number
    organizationNet: number
    paidOrders: number
    discounts: number
    ordersCreated: number
    ordersAbandoned: number
  }
  institutions: {
    universities: NamedCount[]
    universityCount: number
    universityUnmatched: number
    companies: NamedCount[]
    companyCount: number
    companyUnmatched: number
  }
  series: TrendPoint[]
}

type JsonObject = { [key: string]: Json | undefined }
const object = (value: Json | undefined): JsonObject =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {}
const list = (value: Json | undefined): Json[] => (Array.isArray(value) ? value : [])
const number = (value: Json | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const text = (value: Json | undefined) => (typeof value === 'string' ? value : '')
const counts = (value: Json | undefined) =>
  Object.fromEntries(Object.entries(object(value)).map(([key, count]) => [key, number(count)]))
const named = (value: Json | undefined): NamedCount[] =>
  list(value).map((item) => {
    const entry = object(item)
    return { name: text(entry.name), nameAr: text(entry.nameAr), matched: entry.matched === true, learners: number(entry.learners) }
  })

// The overview RPC returns one jsonb document; read it defensively so a missing field shows as zero.
export function parseOverview(data: Json): AnalyticsOverview {
  const root = object(data)
  const range = object(root.range)
  const users = object(root.users)
  const activity = object(root.activity)
  const learning = object(root.learning)
  const revenue = object(root.revenue)
  const institutions = object(root.institutions)
  return {
    range: { days: number(range.days), start: text(range.start), end: text(range.end), bucket: range.bucket === 'week' ? 'week' : 'day' },
    users: {
      total: number(users.total),
      new: number(users.new),
      newPrev: number(users.newPrev),
      byType: counts(users.byType),
      bySegment: counts(users.bySegment),
      atRisk: number(users.atRisk),
    },
    activity: {
      today: number(activity.today),
      week: number(activity.week),
      month: number(activity.month),
      range: number(activity.range),
      rangePrev: number(activity.rangePrev),
    },
    learning: {
      enrollments: number(learning.enrollments),
      enrollmentsPrev: number(learning.enrollmentsPrev),
      bySource: counts(learning.bySource),
      completions: number(learning.completions),
      completionsPrev: number(learning.completionsPrev),
      certificates: number(learning.certificates),
      activeEnrollments: number(learning.activeEnrollments),
      organizations: number(learning.organizations),
      averageProgress: typeof learning.averageProgress === 'number' ? learning.averageProgress : null,
      watchedMinutes: number(learning.watchedMinutes),
      streamedMinutes: number(learning.streamedMinutes),
      streamedMinutesPrev: number(learning.streamedMinutesPrev),
    },
    revenue: {
      currency: text(revenue.currency) || 'EGP',
      gross: number(revenue.gross),
      refunds: number(revenue.refunds),
      net: number(revenue.net),
      netPrev: number(revenue.netPrev),
      organizationNet: number(revenue.organizationNet),
      paidOrders: number(revenue.paidOrders),
      discounts: number(revenue.discounts),
      ordersCreated: number(revenue.ordersCreated),
      ordersAbandoned: number(revenue.ordersAbandoned),
    },
    institutions: {
      universities: named(institutions.universities),
      universityCount: number(institutions.universityCount),
      universityUnmatched: number(institutions.universityUnmatched),
      companies: named(institutions.companies),
      companyCount: number(institutions.companyCount),
      companyUnmatched: number(institutions.companyUnmatched),
    },
    series: list(root.series).map((item) => {
      const point = object(item)
      return {
        date: text(point.date),
        signups: number(point.signups),
        active: number(point.active),
        enrollments: number(point.enrollments),
        revenue: number(point.revenue),
        streamed: number(point.streamed),
      }
    }),
  }
}

// Western digits in both locales (Phase 03 contract), matching the rest of the admin console.
const numberLocale = (locale: Locale) => (locale === 'ar' ? 'ar-u-nu-latn' : 'en')

export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(numberLocale(locale)).format(value)
}

export function formatMoney(minor: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(numberLocale(locale), { style: 'currency', currency, maximumFractionDigits: 0 }).format(minor / 100)
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(numberLocale(locale), { style: 'percent', maximumFractionDigits: 0 }).format(value / 100)
}

// Series and activity dates are calendar days (YYYY-MM-DD) in the platform timezone; format them as such.
export function formatDay(value: string, locale: Locale, { withYear = false } = {}): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(numberLocale(locale), {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(date)
}

export function formatLongDay(value: string, locale: Locale): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(numberLocale(locale), { dateStyle: 'medium', timeZone: 'UTC' }).format(date)
}

/** Percentage change from the previous period, or null when there is nothing to compare against. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

/** a / b as a whole percentage, or null when b is zero. */
export function ratio(a: number, b: number): number | null {
  return b > 0 ? Math.round((a / b) * 100) : null
}
