import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/i18n/page-metadata'
import { isLocale } from '@/i18n/config'
import { PageHeading } from '@/components/layout/page-heading'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'
import { PlacementFlow } from '@/features/placement/components/placement-flow'
import { getAreaOptions } from '@/features/placement/server/areas'
import { getPlacementQuiz, getPlacementStatus } from '@/features/placement/server/placement'
import '@/features/placement/placement.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, 'placement', '/placement')
}

export default async function PlacementRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ mode?: string | string[] }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { mode } = await searchParams
  await requireAuthenticatedUser(locale, `/${locale}/placement`)
  const [status, quiz] = await Promise.all([getPlacementStatus(), getPlacementQuiz(locale)])
  if (!status) throw new Error('Level check unavailable.')
  const areas = await getAreaOptions(locale, status.areas)
  // Changing goals alone only makes sense once there is a result to keep.
  const goalsOnly = mode === 'goals' && Boolean(status.result && status.goals)
  return (
    <>
      <PageHeading page="placement" title="Find your level" subtitle="Answer a few quick questions so we can suggest the right courses for you." />
      <div className="pl-wrap">
        <PlacementFlow mode={goalsOnly ? 'goals' : 'full'} areas={areas} quiz={quiz} initialGoals={status.goals} />
      </div>
    </>
  )
}
