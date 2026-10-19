import { getTranslations } from 'next-intl/server'
import {
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  Plus,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  TriangleAlert,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { locales } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { listAdminCourses } from '@/features/courses/server/course-repository'
import { auditAction } from '../audit-actions'
import { formatAdminDate } from '../format'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { CourseLocaleChips, CourseStatusBadge } from './admin-course-bits'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type CouponRow = { is_active: boolean; expires_at: string | null; redemptions: number | string }

// Live = active and not past its expiry; "expiring" = live and ending within a week.
function summarizeCoupons(rows: CouponRow[]) {
  const now = Date.now()
  const live = rows.filter((row) => row.is_active && (!row.expires_at || new Date(row.expires_at).getTime() > now))
  return {
    live: live.length,
    expiringSoon: live.filter((row) => row.expires_at && new Date(row.expires_at).getTime() - now < WEEK_MS).length,
    paidUses: rows.reduce((sum, row) => sum + Number(row.redemptions), 0),
  }
}

function Stat({ icon: Icon, tone, label, value, detail, href, linkLabel }: {
  icon: LucideIcon
  tone: string
  label: string
  value: string
  detail: string
  href: string
  linkLabel: string
}) {
  return (
    <article className="admin-stat">
      <span className={`admin-stat-icon ${tone}`} aria-hidden="true"><Icon size={20} /></span>
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value" dir="ltr">{value}</p>
      <p className="admin-stat-detail">{detail}</p>
      <Link className="admin-stat-link" href={href}>
        {linkLabel}
        <ArrowUpRight size={15} aria-hidden="true" className="admin-flip" />
      </Link>
    </article>
  )
}

// Read-only snapshot built from the existing admin RPCs; each RPC re-checks the admin role.
// A failing source hides its own figures instead of failing the whole page.
export async function AdminOverview({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'admin' })
  const supabase = await createClient()
  const count = (status: 'published' | 'draft' | 'archived') =>
    listAdminCourses(supabase, { status, limit: 1 }).then((result) => result.total).catch(() => null)

  const [recent, published, drafts, archived, coupons, aiIndex, audit, grants] = await Promise.all([
    listAdminCourses(supabase, { limit: 100 }).catch(() => null),
    count('published'),
    count('draft'),
    count('archived'),
    supabase.rpc('admin_list_coupons'),
    supabase.rpc('admin_ai_index_overview'),
    supabase.rpc('admin_list_audit', { p_limit: 8, p_offset: 0 }),
    supabase.rpc('admin_list_role_grants', { p_limit: 200, p_offset: 0 }),
  ])

  // A revoked admin with an open tab gets the denied state, never partial data.
  if (audit.error?.code === '42501' || grants.error?.code === '42501') return <AdminDenied />

  const number = (value: number) => new Intl.NumberFormat('en').format(value)
  const dash = '—'

  const activeGrants = (grants.data ?? []).filter((row) => row.revoked_at === null)
  const admins = activeGrants.filter((row) => row.role === 'admin').length
  const instructors = activeGrants.filter((row) => row.role === 'instructor').length

  const { live: liveCoupons, expiringSoon, paidUses } = summarizeCoupons(coupons.data ?? [])

  const indexRows = aiIndex.data ?? []
  const indexed = indexRows.filter((row) => row.indexed_at !== null).length
  const coverage = indexRows.length ? Math.round((indexed / indexRows.length) * 100) : 0
  const missingTranscripts = indexRows.filter((row) => row.transcribed_videos < row.videos).length

  const courses = recent?.courses ?? []
  const incompleteTranslations = courses.filter(
    (course) => course.status === 'published' && locales.some((code) => !course.localesPublished.includes(code)),
  ).length

  const attention = [
    drafts ? { tone: 'info', text: t('overview.attention.drafts', { count: drafts }), href: '/admin/courses?status=draft' } : null,
    incompleteTranslations
      ? { tone: 'warn', text: t('overview.attention.translations', { count: incompleteTranslations }), href: '/admin/courses?status=published' }
      : null,
    indexRows.length - indexed > 0
      ? { tone: 'warn', text: t('overview.attention.notIndexed', { count: indexRows.length - indexed }), href: '/admin/ai' }
      : null,
    missingTranscripts ? { tone: 'info', text: t('overview.attention.transcripts', { count: missingTranscripts }), href: '/admin/ai' } : null,
    expiringSoon ? { tone: 'info', text: t('overview.attention.coupons', { count: expiringSoon }), href: '/admin/coupons' } : null,
  ].filter((item) => item !== null)

  const quickActions: { href: string; label: string; icon: LucideIcon }[] = [
    { href: '/admin/courses#new-course', label: t('overview.actions.course'), icon: Plus },
    { href: '/admin/enrollments', label: t('overview.actions.access'), icon: UserPlus },
    { href: '/admin/coupons', label: t('overview.actions.coupon'), icon: TicketPercent },
    { href: '/admin/roles', label: t('overview.actions.role'), icon: ShieldCheck },
  ]

  return (
    <>
      <AdminPageHeader
        eyebrow={t('overview.eyebrow')}
        title={t('overview.title')}
        description={t('overview.subtitle')}
        actions={
          <Link className="btn" href="/admin/courses#new-course">
            <Plus size={18} aria-hidden="true" />
            {t('overview.actions.course')}
          </Link>
        }
      />

      <section className="admin-stats" aria-label={t('overview.statsLabel')}>
        <Stat
          icon={BookOpen}
          tone="blue"
          label={t('overview.stats.courses')}
          value={recent ? number(recent.total) : dash}
          detail={t('overview.stats.coursesDetail', { published: published ?? 0, drafts: drafts ?? 0, archived: archived ?? 0 })}
          href="/admin/courses"
          linkLabel={t('overview.manage')}
        />
        <Stat
          icon={Sparkles}
          tone="violet"
          label={t('overview.stats.ai')}
          value={aiIndex.error ? dash : `${coverage}%`}
          detail={t('overview.stats.aiDetail', { indexed, total: indexRows.length })}
          href="/admin/ai"
          linkLabel={t('overview.manage')}
        />
        <Stat
          icon={TicketPercent}
          tone="green"
          label={t('overview.stats.coupons')}
          value={coupons.error ? dash : number(liveCoupons)}
          detail={t('overview.stats.couponsDetail', { uses: paidUses })}
          href="/admin/coupons"
          linkLabel={t('overview.manage')}
        />
        <Stat
          icon={ShieldCheck}
          tone="amber"
          label={t('overview.stats.admins')}
          value={grants.error ? dash : number(admins)}
          detail={t('overview.stats.adminsDetail', { instructors })}
          href="/admin/roles"
          linkLabel={t('overview.manage')}
        />
      </section>

      <div className="admin-overview-grid">
        <section className="panel admin-card" aria-labelledby="admin-recent-courses">
          <div className="admin-card-head">
            <h2 id="admin-recent-courses">{t('overview.recentCourses')}</h2>
            <Link className="admin-text-link" href="/admin/courses">{t('overview.viewAll')}</Link>
          </div>
          {!recent ? (
            <p className="admin-empty" role="alert">{t('errors.failed')}</p>
          ) : courses.length === 0 ? (
            <p className="admin-empty">{t('courses.empty')}</p>
          ) : (
            <ul className="admin-list">
              {courses.slice(0, 6).map((course) => (
                <li key={course.id}>
                  <Link className="admin-list-main" href={`/admin/courses/${course.id}`}>
                    <strong dir="ltr">{course.slug}</strong>
                    <span className="admin-sub">{t('overview.updated', { date: formatAdminDate(course.updatedAt, locale) })}</span>
                  </Link>
                  <CourseLocaleChips present={course.localesPresent} published={course.localesPublished} />
                  <CourseStatusBadge status={course.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="admin-overview-side">
          <section className="panel admin-card" aria-labelledby="admin-attention">
            <h2 id="admin-attention">{t('overview.attentionTitle')}</h2>
            {attention.length === 0 ? (
              <p className="admin-allclear">
                <CircleCheck size={18} aria-hidden="true" />
                {t('overview.allClear')}
              </p>
            ) : (
              <ul className="admin-attention">
                {attention.map((item) => (
                  <li key={item.text} className={item.tone}>
                    <TriangleAlert size={16} aria-hidden="true" />
                    <Link href={item.href}>{item.text}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel admin-card" aria-labelledby="admin-quick">
            <h2 id="admin-quick">{t('overview.quickTitle')}</h2>
            <div className="admin-quick">
              {quickActions.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel admin-card" aria-labelledby="admin-activity">
        <div className="admin-card-head">
          <h2 id="admin-activity">{t('overview.activity')}</h2>
          <Link className="admin-text-link" href="/admin/audit">{t('overview.viewAudit')}</Link>
        </div>
        {audit.error ? (
          <p className="admin-empty" role="alert">{t('errors.failed')}</p>
        ) : (audit.data ?? []).length === 0 ? (
          <p className="admin-empty">{t('audit.empty')}</p>
        ) : (
          <ol className="admin-timeline">
            {(audit.data ?? []).map((row) => {
              const { key, tone } = auditAction(row.action)
              return (
                <li key={row.id}>
                  <span className={`admin-dot ${tone}`} aria-hidden="true" />
                  <div>
                    <p>
                      <strong>{row.actor_name ?? row.actor_email ?? t('table.unnamed')}</strong>{' '}
                      <span className={`admin-tag ${tone}`}>{key ? t(`audit.actions.${key}`) : row.action}</span>
                      {(row.subject_name || row.subject_email) && (
                        <span className="admin-sub-inline"> · {row.subject_name ?? <bdi dir="ltr">{row.subject_email}</bdi>}</span>
                      )}
                    </p>
                    <time className="admin-sub" dateTime={row.occurred_at}>{formatAdminDate(row.occurred_at, locale)}</time>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </>
  )
}
