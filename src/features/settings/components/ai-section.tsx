'use client'

import { useTranslations } from 'next-intl'
import { Sparkles } from 'lucide-react'
import { Link } from '@/i18n/navigation'

export function AiSection() {
  const t = useTranslations('settings')
  return (
    <div className="settings-section">
      <div className="settings-empty">
        <span className="settings-empty-icon"><Sparkles size={28} aria-hidden="true" /></span>
        <strong>{t('aiComingTitle')}</strong>
        <p>{t('aiComingCopy')}</p>
        <Link className="btn outline" href="/ai-page">{t('openAiAssistant')}</Link>
      </div>
    </div>
  )
}
