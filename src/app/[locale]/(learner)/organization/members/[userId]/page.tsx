import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'
import { OrgMemberDetail, isUuid } from '@/features/organizations/components/org-sections'
import '@/features/admin/admin.css'
import '@/features/organizations/organizations.css'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default async function OrganizationMemberRoute({ params, searchParams }: {
  params: Promise<{ locale: string; userId: string }>
  searchParams: Promise<{ org?: string }>
}) {
  const [{ locale, userId }, query] = await Promise.all([params, searchParams])
  if (!isLocale(locale) || !isUuid(userId) || !isUuid(query.org)) notFound()
  await requireAuthenticatedUser(locale, `/${locale}/organization`)
  const org = query.org
  return (
    <div className="admin-scope org-portal">
      <OrgMemberDetail
        locale={locale}
        orgId={org}
        userId={userId}
        links={{
          tab: (value) => `/organization?org=${org}&tab=${value}`,
          member: (id) => `/organization/members/${id}?org=${org}`,
          back: `/organization?org=${org}&tab=members`,
        }}
      />
    </div>
  )
}
