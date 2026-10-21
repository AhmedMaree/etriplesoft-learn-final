import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getAdminAccess } from '@/lib/supabase/auth'
import { parseRange } from '@/features/admin/analytics'
import { AnalyticsCoursePage } from '@/features/admin/components/analytics-course-page'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminAnalyticsCourseRoute({ params, searchParams }: {
  params: Promise<{ locale: string; courseId: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const [{ locale, courseId }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale) || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(courseId)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AnalyticsCoursePage locale={locale} range={parseRange(query.range)} courseId={courseId} />
}
