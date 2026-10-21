import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { isLocale } from '@/i18n/config'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'
import { JoinInvitation } from '@/features/organizations/components/org-portal'
import '@/features/admin/admin.css'
import '@/features/organizations/organizations.css'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

// Opened from an invitation link. Signed-out visitors sign in first and come back to the same code.
export default async function JoinRoute({ params, searchParams }: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ code?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale)) notFound()
  const code = typeof query.code === 'string' ? query.code.trim() : ''
  await requireAuthenticatedUser(locale, /^[A-Za-z0-9_-]{32}$/.test(code) ? `/${locale}/join?code=${code}` : `/${locale}/organization`)
  const t = await getTranslations({ locale, namespace: 'organizations' })
  return (
    <>
      <div className="page-heading heading-organization">
        <h1>{t('join.heading')}</h1>
        <p>{t('join.subtitle')}</p>
      </div>
      <div className="admin-scope org-portal">
        <JoinInvitation locale={locale} code={code} />
      </div>
    </>
  )
}
