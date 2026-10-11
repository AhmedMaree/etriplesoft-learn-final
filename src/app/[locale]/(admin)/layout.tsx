import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/config'
import { getAdminAccess } from '@/lib/supabase/auth'
import { AdminDenied } from '@/features/admin/components/admin-denied'
import { AdminNav } from '@/features/admin/components/admin-nav'
import '@/features/admin/admin.css'

// Admin pages are private and depend on the current role row: never statically rendered or shared-cached.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const access = await getAdminAccess()
  if (access.status === 'anonymous') redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`)

  const t = await getTranslations({ locale, namespace: 'admin' })
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <strong>{t('shell.title')}</strong>
        {access.status === 'admin' && <AdminNav />}
      </header>
      <main className="admin-main" id="admin-main">
        {access.status === 'admin' ? children : <AdminDenied />}
      </main>
    </div>
  )
}
