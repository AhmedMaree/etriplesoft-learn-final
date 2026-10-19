'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/primitives'

export function SettingsButtons({ dirty, saving, onCancel }: { dirty: boolean; saving: boolean; onCancel: () => void }) {
  const t = useTranslations('settings')
  const common = useTranslations('common')
  return (
    <div className="settings-buttons">
      <p className="settings-dirty" aria-live="polite">{dirty ? t('unsavedChanges') : ''}</p>
      <Button outline onClick={onCancel} disabled={!dirty || saving}>{common('cancel')}</Button>
      <Button type="submit" disabled={!dirty || saving}>{saving ? t('saving') : common('save')}</Button>
    </div>
  )
}
