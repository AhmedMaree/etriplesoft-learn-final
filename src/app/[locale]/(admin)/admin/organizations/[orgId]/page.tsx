import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getAdminAccess } from '@/lib/supabase/auth'
import { AdminOrganizationPage } from '@/features/admin/components/organizations-page'
import { isUuid, parseOrgTab } from '@/features/organizations/components/org-sections'
import '@/features/organizations/organizations.css'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminOrganizationRoute({ params, searchParams }: {
  params: Promise<{ locale: string; orgId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ locale, orgId }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale) || !isUuid(orgId)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AdminOrganizationPage locale={locale} orgId={orgId} tab={parseOrgTab(query.tab)} />
}
