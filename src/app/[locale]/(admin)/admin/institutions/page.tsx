import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { createPageMetadata } from '@/i18n/page-metadata'
import { getAdminAccess } from '@/lib/supabase/auth'
import { InstitutionsPage } from '@/features/admin/components/institutions-page'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const metadata = await createPageMetadata(params, 'adminInstitutions', '/admin/institutions')
  return { ...metadata, robots: { index: false, follow: false } }
}

export default async function AdminInstitutionsRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ kind?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return <InstitutionsPage locale={locale} kind={query.kind === 'company' ? 'company' : 'university'} />
}
