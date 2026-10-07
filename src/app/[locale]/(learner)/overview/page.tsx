import { createPageMetadata } from '@/i18n/page-metadata'
import { OverviewPage } from '@/features/dashboard/components/overview-page'
import { isLocale } from '@/i18n/config'
import { notFound } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, 'overview', '/overview')
}

export default async function OverviewAliasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  await requireAuthenticatedUser(locale, `/${locale}/overview`)
  return <OverviewPage />
}
