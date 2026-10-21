import { createPageMetadata } from '@/i18n/page-metadata'
import { OverviewPage } from '@/features/dashboard/components/overview-page'
import { isLocale } from '@/i18n/config'
import { notFound, redirect } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'
import { getPlacementStatus } from '@/features/placement/server/placement'
import { getLearningSummary } from '@/features/learning/server/summary'
import { getLearningStreak } from '@/features/calendar/server/calendar'
import { needsPlacement } from '@/features/placement/types'
import '@/features/placement/placement.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, 'overview', '/overview')
}

export default async function OverviewAliasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  await requireAuthenticatedUser(locale, `/${locale}/overview`)
  // Start the dashboard's per-request (memoized) reads now, so they run alongside the placement check
  // instead of after it; the dashboard awaits these same requests.
  void getLearningSummary(locale).catch(() => null)
  void getLearningStreak().catch(() => null)
  // First visit: ask the level-check questions before the overview. Only the overview redirects, so a
  // learner returning to checkout or a course page after sign-in is never interrupted.
  const placement = await getPlacementStatus()
  if (placement && needsPlacement(placement)) redirect(`/${locale}/placement`)
  return <OverviewPage />
}
