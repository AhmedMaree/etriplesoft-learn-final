import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { parseSearch, parseSegment } from '@/features/admin/analytics'
import { parsePage } from '@/features/admin/format'
import { AnalyticsLearnersPage } from '@/features/admin/components/analytics-learners-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminAnalyticsLearners', '/admin/analytics/learners')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminAnalyticsLearnersRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; q?: string; segment?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return (
    <AnalyticsLearnersPage
      locale={locale}
      page={parsePage(query.page)}
      search={parseSearch(query.q)}
      segment={parseSegment(query.segment)}
    />
  )
}
