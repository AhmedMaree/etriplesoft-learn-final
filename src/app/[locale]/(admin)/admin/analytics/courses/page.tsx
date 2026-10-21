import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { parseRange } from '@/features/admin/analytics'
import { AnalyticsCoursesPage } from '@/features/admin/components/analytics-courses-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminAnalyticsCourses', '/admin/analytics/courses')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminAnalyticsCoursesRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AnalyticsCoursesPage locale={locale} range={parseRange(query.range)} />
}
