import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { AdminOverview } from '@/features/admin/components/admin-overview'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'admin', '/admin')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminOverviewRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  // The layout renders the denied state; never query on behalf of a non-admin.
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AdminOverview locale={locale} />
}
