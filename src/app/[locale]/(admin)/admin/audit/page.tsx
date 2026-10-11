import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { parsePage } from '@/features/admin/format'
import { AuditPage } from '@/features/admin/components/audit-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminAudit', '/admin/audit')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminAuditRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return <AuditPage locale={locale} page={parsePage(query.page)} />
}
