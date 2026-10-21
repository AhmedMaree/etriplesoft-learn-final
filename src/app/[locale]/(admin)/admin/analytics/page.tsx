import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { parseRange } from '@/features/admin/analytics'
import { AnalyticsOverviewPage } from '@/features/admin/components/analytics-overview-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminAnalytics', '/admin/analytics')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminAnalyticsRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  // The layout renders the denied state; never query on behalf of a non-admin.
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AnalyticsOverviewPage locale={locale} range={parseRange(query.range)} />
}
