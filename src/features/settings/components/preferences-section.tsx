'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Info } from 'lucide-react'
import { useDemoToast } from '@/lib/browser/demo-toast'
import { saveSettingsAction } from '@/features/settings/actions'
import type { PreferenceKey } from '@/features/settings/tabs'
import type { Database } from '@/types/database'
import { SettingsButtons } from './settings-buttons'
import { PlacementSettingsLinks } from '@/features/placement/components/placement-settings-links'

type LearnerPreferences = Database['public']['Tables']['learner_preferences']['Row']

const groups: Record<'notifications' | 'learning', { key: PreferenceKey; label: string }[]> = {
  notifications: [
    { key: 'email_notifications', label: 'emailNotifications' },
    { key: 'course_reminders', label: 'courseReminders' },
    { key: 'assignment_deadlines', label: 'assignmentDeadlines' },
    { key: 'community_updates', label: 'communityUpdates' },
  ],
  learning: [
    { key: 'autoplay_next', label: 'autoplayNext' },
    { key: 'daily_learning_reminders', label: 'dailyLearningReminders' },
    { key: 'course_recommendations', label: 'courseRecommendations' },
  ],
}

function savedToggles(preferences: LearnerPreferences): Record<PreferenceKey, boolean> {
  return {
    email_notifications: preferences.email_notifications,
    course_reminders: preferences.course_reminders,
    assignment_deadlines: preferences.assignment_deadlines,
    community_updates: preferences.community_updates,
    daily_learning_reminders: preferences.daily_learning_reminders,
    course_recommendations: preferences.course_recommendations,
    autoplay_next: preferences.autoplay_next,
  }
}

export function PreferencesSection({
  group,
  preferences,
  onDirtyChange,
}: {
  group: 'notifications' | 'learning'
  preferences: LearnerPreferences
  onDirtyChange: (dirty: boolean) => void
}) {
  const t = useTranslations('settings')
  const notify = useDemoToast()
  const router = useRouter()
  const [saved, setSaved] = useState(() => savedToggles(preferences))
  const [toggles, setToggles] = useState(saved)
  const [saving, setSaving] = useState(false)
  const controls = groups[group]
  const dirty = controls.some(({ key }) => toggles[key] !== saved[key])
  const allOn = controls.every(({ key }) => toggles[key])

  function update(next: Record<PreferenceKey, boolean>) {
    setToggles(next)
    onDirtyChange(controls.some(({ key }) => next[key] !== saved[key]))
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const result = await saveSettingsAction({ preferences: toggles })
    setSaving(false)
    if (result !== 'saved') {
      notify(t('saveError'))
      return
    }
    setSaved(toggles)
    onDirtyChange(false)
    notify(t('saved'))
    router.refresh()
  }

  return (
    <form className="settings-section" onSubmit={save}>
      <div className="settings-note">
        <Info size={18} aria-hidden="true" />
        <p>{group === 'notifications' ? t('notificationsDeliveryNote') : t('learningNote')}</p>
      </div>
      <div className="preference-toolbar">
        <button
          type="button"
          className="text-button"
          onClick={() => update({ ...toggles, ...Object.fromEntries(controls.map(({ key }) => [key, !allOn])) })}
        >
          {allOn ? t('turnAllOff') : t('turnAllOn')}
        </button>
      </div>
      <div className="preference-options">
        {controls.map(({ key, label }) => (
          <label key={key} htmlFor={`preference-${key}`}>
            <span>
              <strong id={`preference-${key}-label`}>{t(label)}</strong>
              <p id={`preference-${key}-description`}>{t(`${label}Description`)}</p>
            </span>
            <button
              id={`preference-${key}`}
              type="button"
              role="switch"
              aria-labelledby={`preference-${key}-label`}
              aria-describedby={`preference-${key}-description`}
              aria-checked={toggles[key]}
              className={`switch ${toggles[key] ? 'on' : ''}`}
              onClick={() => update({ ...toggles, [key]: !toggles[key] })}
            />
          </label>
        ))}
      </div>
      {group === 'learning' && <PlacementSettingsLinks />}
      <SettingsButtons dirty={dirty} saving={saving} onCancel={() => update(saved)} />
    </form>
  )
}
