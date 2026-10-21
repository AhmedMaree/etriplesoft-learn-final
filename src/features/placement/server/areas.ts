import 'server-only'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/config'
import { getMarketingMessages } from '@/features/marketing/lib/messages'
import type { AreaOption } from '../components/placement-flow'

/** Display names for areas (course categories). A category without placement copy falls back to its catalog name. */
export async function getAreaOptions(locale: Locale, keys: string[]): Promise<AreaOption[]> {
  const t = await getTranslations({ locale, namespace: 'placement' })
  const categoryNames = getMarketingMessages(locale).catalog.categoryNames as Record<string, string>
  return keys.map((key) => ({
    key,
    title: t.has(`areas.${key}.title`) ? t(`areas.${key}.title`) : (categoryNames[key] ?? key),
    description: t.has(`areas.${key}.description`) ? t(`areas.${key}.description`) : null,
  }))
}
