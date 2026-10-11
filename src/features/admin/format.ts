import type { Locale } from '@/i18n/config'

// Western digits in both locales (Phase 03 contract); UTC so a record reads the same for every admin.
export function formatAdminDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export function parsePage(value: string | undefined): number {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1
}
