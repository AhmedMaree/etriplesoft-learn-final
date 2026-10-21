'use client'

import { useTranslations } from 'next-intl'
import { BarChart3 } from 'lucide-react'
import { Link } from '@/i18n/navigation'

/** Learning settings entry points to retake the level check or change goals. */
export function PlacementSettingsLinks() {
  const t = useTranslations('placement')
  return (
    <div className="settings-note placement-settings">
      <BarChart3 size={18} aria-hidden="true" />
      <div>
        <p>
          <strong>{t('settings.heading')}</strong>
        </p>
        <p>{t('settings.copy')}</p>
        <p className="placement-settings-links">
          <Link className="text-link" href="/placement">
            {t('overview.retake')}
          </Link>
          <Link className="text-link" href="/placement?mode=goals">
            {t('overview.changeGoals')}
          </Link>
        </p>
      </div>
    </div>
  )
}
