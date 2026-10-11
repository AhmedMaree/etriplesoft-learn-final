import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'
import { createClient } from '@/lib/supabase/server'
import { ADMIN_PAGE_SIZE } from '../roles'
import { formatAdminDate } from '../format'
import { AdminDenied } from './admin-denied'
import { AdminPager } from './admin-pager'

function actionKey(action: string): 'granted' | 'revoked' | 'lookedUp' | null {
  if (action === 'user_role.granted') return 'granted'
  if (action === 'user_role.revoked') return 'revoked'
  if (action === 'user.looked_up') return 'lookedUp'
  return null
}

export async function AuditPage({ locale, page }: { locale: Locale; page: number }) {
  const t = await getTranslations({ locale, namespace: 'admin' })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_list_audit', {
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  })

  if (error?.code === '42501') return <AdminDenied />
  if (error) throw new Error('Could not load the audit log.')

  const rows = data ?? []
  const total = rows[0]?.total_count ?? 0

  return (
    <>
      <h1>{t('audit.title')}</h1>
      <p className="admin-lead">{t('audit.subtitle')}</p>
      <section className="panel" aria-labelledby="admin-audit-title">
        <h2 id="admin-audit-title" className="admin-visually-hidden">{t('audit.title')}</h2>
        {rows.length === 0 ? (
          <p>{t('audit.empty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="admin-audit-title">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('audit.when')}</th>
                  <th scope="col">{t('audit.action')}</th>
                  <th scope="col">{t('audit.actor')}</th>
                  <th scope="col">{t('audit.subject')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = actionKey(row.action)
                  return (
                    <tr key={row.id}>
                      <td>{formatAdminDate(row.occurred_at, locale)}</td>
                      <td>{key ? t(`audit.actions.${key}`) : row.action}</td>
                      <td>
                        <strong>{row.actor_name ?? t('table.unnamed')}</strong>
                        <span className="admin-ltr" dir="ltr">{row.actor_email ?? ''}</span>
                      </td>
                      <td>
                        <strong>{row.subject_name ?? (row.subject_email ? t('table.unnamed') : '')}</strong>
                        <span className="admin-ltr" dir="ltr">{row.subject_email ?? ''}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <AdminPager href="/admin/audit" page={page} total={total} />
      </section>
    </>
  )
}
