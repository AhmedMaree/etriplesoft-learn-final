import { getTranslations } from 'next-intl/server'
import { Info } from 'lucide-react'
import type { Locale } from '@/i18n/config'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCount } from '../analytics'
import { AdminDenied } from './admin-denied'
import { AdminPageHeader } from './admin-page-header'
import { CreateInstitutionForm, LinkNameForm } from './institution-forms'

export type InstitutionKind = 'university' | 'company'

export async function InstitutionsPage({ locale, kind }: { locale: Locale; kind: InstitutionKind }) {
  const t = await getTranslations({ locale, namespace: 'admin.institutions' })
  const admin = await getTranslations({ locale, namespace: 'admin' })
  const supabase = await createClient()
  const [institutions, unmatched] = await Promise.all([
    supabase.rpc('admin_list_institutions', { p_kind: kind }),
    supabase.rpc('admin_list_unmatched_institution_names', { p_kind: kind }),
  ])
  if (institutions.error?.code === '42501' || unmatched.error?.code === '42501') return <AdminDenied />
  if (institutions.error || unmatched.error) throw new Error('Could not load institutions.')

  const rows = institutions.data ?? []
  const names = unmatched.data ?? []
  const label = (row: { name_en: string; name_ar: string | null }) => (locale === 'ar' && row.name_ar ? row.name_ar : row.name_en)
  const options = rows.map((row) => ({ id: row.id, label: label(row) })).sort((a, b) => a.label.localeCompare(b.label, locale))

  return (
    <>
      <AdminPageHeader eyebrow={admin('nav.groups.learners')} title={t('title')} description={t('subtitle')} />
      <nav className="admin-tabs" aria-label={t('kindFilter')}>
        {(['university', 'company'] as const).map((value) => (
          <Link key={value} href={`/admin/institutions?kind=${value}`} aria-current={value === kind ? 'page' : undefined}>
            {t(`kinds.${value}`)}
          </Link>
        ))}
      </nav>

      <section className="panel admin-card" aria-labelledby="institutions-review">
        <div className="admin-card-head">
          <h2 id="institutions-review">{t('reviewTitle')}</h2>
          <span className="admin-count" dir="ltr">{names.length}</span>
        </div>
        <p className="admin-hint">{t('reviewHint')}</p>
        {names.length === 0 ? (
          <p className="admin-empty">{t('reviewEmpty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="institutions-review">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('typedName')}</th>
                  <th scope="col">{t('learners')}</th>
                  <th scope="col">{t('linkTo')}</th>
                </tr>
              </thead>
              <tbody>
                {names.map((row, index) => (
                  <tr key={row.name}>
                    <td><strong dir="auto">{row.name}</strong></td>
                    <td className="admin-num" dir="ltr">{formatCount(row.learners, locale)}</td>
                    <td><LinkNameForm kind={kind} name={row.name} options={options} index={index} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel admin-card" aria-labelledby="institutions-create">
        <h2 id="institutions-create">{t(`create_${kind}`)}</h2>
        <CreateInstitutionForm kind={kind} unmatched={names.map((row) => row.name)} />
      </section>

      <section className="panel admin-card" aria-labelledby="institutions-list">
        <div className="admin-card-head">
          <h2 id="institutions-list">{t(`list_${kind}`)}</h2>
          <span className="admin-count" dir="ltr">{rows.length}</span>
        </div>
        {rows.length === 0 ? (
          <p className="admin-empty">{t('listEmpty')}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="institutions-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{t('nameEn')}</th>
                  <th scope="col">{t('nameAr')}</th>
                  <th scope="col">{t('learners')}</th>
                  <th scope="col">{t('spellings')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td><strong dir="ltr">{row.name_en}</strong></td>
                    <td dir="rtl" lang="ar">{row.name_ar ?? '—'}</td>
                    <td className="admin-num" dir="ltr">{formatCount(row.learners, locale)}</td>
                    <td className="admin-num" dir="ltr">{formatCount(row.aliases, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="admin-note">
        <Info size={18} aria-hidden="true" />
        <p>{t('note')}</p>
      </aside>
    </>
  )
}
