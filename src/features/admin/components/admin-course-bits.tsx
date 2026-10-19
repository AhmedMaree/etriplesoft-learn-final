import { getTranslations } from 'next-intl/server'
import { locales } from '@/i18n/config'

// Course status pill shared by the overview and the course list.
export async function CourseStatusBadge({ status }: { status: string }) {
  const t = await getTranslations('admin')
  const known = status === 'published' || status === 'draft' || status === 'archived'
  return <span className={`admin-badge ${known ? status : ''}`}>{known ? t(`courseStatus.${status}`) : status}</span>
}

// One chip per supported locale: published, saved as a draft, or not written yet.
export async function CourseLocaleChips({ present, published }: { present: string[]; published: string[] }) {
  const t = await getTranslations('admin')
  return (
    <span className="admin-locale-chips">
      {locales.map((locale) => {
        const state = published.includes(locale) ? 'published' : present.includes(locale) ? 'draft' : 'missing'
        return (
          <span
            key={locale}
            className={`admin-locale-chip ${state}`}
            title={t(`localeState.${state}`, { language: t(`languages.${locale}`) })}
            aria-label={t(`localeState.${state}`, { language: t(`languages.${locale}`) })}
          >
            {locale.toUpperCase()}
          </span>
        )
      })}
    </span>
  )
}
