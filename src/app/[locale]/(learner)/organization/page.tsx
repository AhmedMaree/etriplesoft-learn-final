import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { isLocale } from '@/i18n/config'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'
import { OrganizationPortal } from '@/features/organizations/components/org-portal'
import { isUuid, parseOrgTab } from '@/features/organizations/components/org-sections'
import '@/features/admin/admin.css'
import '@/features/organizations/organizations.css'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

// Members see their organization; managers manage it. Every read and write is authorized in the database.
export default async function OrganizationRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ org?: string; tab?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  await requireAuthenticatedUser(locale, `/${locale}/organization`)
  const t = await getTranslations({ locale, namespace: 'organizations' })
  return (
    <>
      <div className="page-heading heading-organization">
        <h1>{t('portal.title')}</h1>
        <p>{t('portal.subtitle')}</p>
      </div>
      <div className="admin-scope org-portal">
        <OrganizationPortal locale={locale} orgId={isUuid(query.org) ? query.org : undefined} tab={parseOrgTab(query.tab)} />
      </div>
    </>
  )
}
