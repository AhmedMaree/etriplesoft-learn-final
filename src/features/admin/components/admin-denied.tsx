import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export async function AdminDenied() {
  const t = await getTranslations('admin')
  return (
    <section className="panel admin-denied" role="alert">
      <h1>{t('denied.title')}</h1>
      <p>{t('denied.body')}</p>
      <Link className="btn" href="/overview">{t('denied.back')}</Link>
    </section>
  )
}
