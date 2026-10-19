import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PAGE_SIZE } from '../roles'
import { formatAdminDate } from '../format'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { AdminPager } from './admin-pager'
import { GrantRoleForm } from './grant-role-form'
import { RevokeRoleButton } from './revoke-role-button'

export async function RolesPage({ locale, page }: { locale: Locale; page: number }) {
  const t = await getTranslations({ locale, namespace: 'admin' })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_list_role_grants', {
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  })

  // The RPC re-checks the current role; a revoked admin with a stale page gets nothing.
  if (error?.code === '42501') return <AdminDenied />
  if (error) throw new Error('Could not load role grants.')

  const rows = data ?? []
  const total = rows[0]?.total_count ?? 0

  return (
    <>
      <AdminPageHeader eyebrow={t('nav.groups.security')} title={t('roles.title')} description={t('roles.subtitle')} />

      <section className="panel admin-card" aria-labelledby="admin-grant-title">
        <h2 id="admin-grant-title">{t('grant.title')}</h2>
        <p className="admin-hint">{t('grant.hint')}</p>
        <GrantRoleForm />
      </section>

      <section className="panel admin-card" aria-labelledby="admin-grants-title">
        <div className="admin-card-head">
          <h2 id="admin-grants-title">{t('table.title')}</h2>
          {total > 0 && <span className="admin-count" dir="ltr">{total}</span>}
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty">{t('table.empty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="admin-grants-title">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('table.user')}</th>
                  <th scope="col">{t('table.role')}</th>
                  <th scope="col">{t('table.granted')}</th>
                  <th scope="col">{t('table.status')}</th>
                  <th scope="col"><span className="admin-visually-hidden">{t('table.actions')}</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = row.display_name ?? t('table.unnamed')
                  const active = row.revoked_at === null
                  const roleLabel = t(`roles.${row.role === 'admin' ? 'admin' : 'instructor'}`)
                  return (
                    <tr key={row.id}>
                      <td>
                        <span className="admin-person">
                          <span className="admin-avatar" aria-hidden="true">{(row.display_name || row.email || '?').slice(0, 1).toUpperCase()}</span>
                          <span>
                            <strong>{name}</strong>
                            <span className="admin-ltr" dir="ltr">{row.email ?? ''}</span>
                          </span>
                        </span>
                      </td>
                      <td><span className={`admin-tag ${row.role === 'admin' ? 'security' : 'content'}`}>{roleLabel}</span></td>
                      <td>
                        {formatAdminDate(row.granted_at, locale)}
                        <span className="admin-sub">{t('table.by', { name: row.granted_by_name ?? t('table.unnamed') })}</span>
                      </td>
                      <td>
                        <span className={`admin-badge ${active ? 'active' : 'revoked'}`}>
                          {active ? t('table.active') : t('table.revokedOn', { date: formatAdminDate(row.revoked_at as string, locale) })}
                        </span>
                      </td>
                      <td>
                        {active && <RevokeRoleButton roleId={row.id} label={t('table.revokeFor', { name, role: roleLabel })} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <AdminPager href="/admin/roles" page={page} total={total} />
      </section>
    </>
  )
}
