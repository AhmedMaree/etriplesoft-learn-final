import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getAdminAccess } from '@/lib/supabase/auth'
import { OrgMemberDetail, isUuid } from '@/features/organizations/components/org-sections'
import '@/features/organizations/organizations.css'

export const metadata = { robots: { index: false, follow: false } }

export default async function AdminOrganizationMemberRoute({ params }: { params: Promise<{ locale: string; orgId: string; userId: string }> }) {
  const { locale, orgId, userId } = await params
  if (!isLocale(locale) || !isUuid(orgId) || !isUuid(userId)) notFound()
  if ((await getAdminAccess()).status !== 'admin') return null
  return (
    <OrgMemberDetail
      locale={locale}
      orgId={orgId}
      userId={userId}
      links={{
        tab: (value) => `/admin/organizations/${orgId}?tab=${value}`,
        member: (id) => `/admin/organizations/${orgId}/members/${id}`,
        back: `/admin/organizations/${orgId}?tab=members`,
      }}
    />
  )
}
