import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { isLocale } from '@/i18n/config'
import { getAdminAccess } from '@/lib/supabase/auth'
import { AdminDenied } from '@/features/admin/components/admin-denied'
import { AdminMfa } from '@/features/admin/components/admin-mfa'
import { AdminShell } from '@/features/admin/components/admin-shell'
import '@/features/admin/admin.css'

// Admin pages are private and depend on the current role row: never statically rendered or shared-cached.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  setRequestLocale(locale)

  const access = await getAdminAccess()
  if (access.status === 'anonymous') redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/admin`)}`)

  if (access.status === 'mfaEnroll' || access.status === 'mfaVerify') {
    return <AdminShell showNav={false}><AdminMfa locale={locale} mode={access.status === 'mfaEnroll' ? 'enroll' : 'verify'} /></AdminShell>
  }

  if (access.status !== 'admin') {
    return <AdminShell showNav={false}><AdminDenied /></AdminShell>
  }
  const metadata = access.user.user_metadata as { display_name?: unknown } | undefined
  const user = {
    name: typeof metadata?.display_name === 'string' ? metadata.display_name : '',
    email: access.user.email ?? '',
  }
  return <AdminShell showNav user={user}>{children}</AdminShell>
}
