import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { AdminOrganizationsPage } from '@/features/admin/components/organizations-page'
import '@/features/organizations/organizations.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminOrganizations', '/admin/organizations')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminOrganizationsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AdminOrganizationsPage locale={locale} />
}
