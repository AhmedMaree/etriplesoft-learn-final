import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { parsePage } from '@/features/admin/format'
import { RolesPage } from '@/features/admin/components/roles-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminRoles', '/admin/roles')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminRolesRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  // The layout renders the denied state; never query on behalf of a non-admin.
  if ((await getAdminAccess()).status !== 'admin') return null
  return <RolesPage locale={locale} page={parsePage(query.page)} />
}
