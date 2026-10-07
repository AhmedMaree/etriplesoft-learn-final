'use client'

import { useState, type FormEvent } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useRouter } from 'next/navigation'
import { Sparkles, Bell, BarChart3, User, Mail, Lock, Globe, Languages, Camera, CreditCard } from 'lucide-react'
import { Button, Panel } from '@/components/ui/primitives'
import { Avatar } from '@/components/shared/profile-avatar'
import { useDemoToast } from '@/lib/browser/demo-toast'
import { useTranslations } from 'next-intl'
import { Field } from '@/components/ui/field'
import { useLocaleChange } from '@/i18n/use-locale-change'
import { updateLocalePreferenceAction } from '@/features/auth/actions'
import { saveSettingsAction } from '@/features/settings/actions'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { Locale } from '@/i18n/config'

type LearnerPreferences = Database['public']['Tables']['learner_preferences']['Row']
type PreferenceKey = 'email_notifications' | 'course_reminders' | 'assignment_deadlines' | 'community_updates' | 'daily_learning_reminders' | 'course_recommendations' | 'autoplay_next'

const preferenceControls: { key: PreferenceKey; label: string }[] = [
  { key: 'email_notifications', label: 'emailNotifications' },
  { key: 'course_reminders', label: 'courseReminders' },
  { key: 'assignment_deadlines', label: 'assignmentDeadlines' },
  { key: 'community_updates', label: 'communityUpdates' },
  { key: 'daily_learning_reminders', label: 'dailyLearningReminders' },
  { key: 'course_recommendations', label: 'courseRecommendations' },
  { key: 'autoplay_next', label: 'autoplayNext' },
]

export function SettingsPage({
  userId,
  email,
  displayName,
  avatarUrl,
  preferences,
  locale,
}: {
  userId: string
  email: string
  displayName: string
  avatarUrl: string | null
  preferences: LearnerPreferences
  locale: Locale
}) {
  const t = useTranslations('settings')
  const common = useTranslations('common')
  const auth = useTranslations('auth')
  const { changeLocale } = useLocaleChange()
  const notify = useDemoToast()
  const router = useRouter()
  const [tab, setTab] = useState<'Profile' | 'Account' | 'Security' | 'Notifications' | 'Learning Preferences' | 'AI Assistant Preferences'>('Profile')
  const [toggles, setToggles] = useState<Record<PreferenceKey, boolean>>({
    email_notifications: preferences.email_notifications,
    course_reminders: preferences.course_reminders,
    assignment_deadlines: preferences.assignment_deadlines,
    community_updates: preferences.community_updates,
    daily_learning_reminders: preferences.daily_learning_reminders,
    course_recommendations: preferences.course_recommendations,
    autoplay_next: preferences.autoplay_next,
  })
  const [photo, setPhoto] = useState(avatarUrl)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const tabs = [
    ['Profile', 'profile', 'profileDescription', User],
    ['Account', 'account', 'accountDescription', CreditCard],
    ['Security', 'security', 'securityDescription', Lock],
    ['Notifications', 'notifications', 'notificationsDescription', Bell],
    ['Learning Preferences', 'learningPreferences', 'learningDescription', BarChart3],
    ['AI Assistant Preferences', 'aiPreferences', 'aiDescription', Sparkles],
  ] as const
  const tabTitle = tabs.find(([key]) => key === tab)?.[1] ?? 'profile'
  const isPreferencesTab = tab === 'Notifications' || tab === 'Learning Preferences'
  const editable = tab === 'Profile' || isPreferencesTab

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('display_name') ?? '')
    const timezone = String(data.get('timezone') ?? '')
    setSaving(true)
    const result = await saveSettingsAction({ displayName: name, timezone, preferences: toggles })
    setSaving(false)
    notify(result === 'saved' ? t('saved') : result === 'invalid' ? t('saveError') : t('saveError'))
  }

  async function uploadAvatar(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      notify(t('invalidImage'))
      return
    }
    setUploading(true)
    const supabase = createClient()
    const objectKey = `${userId}/avatar`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(objectKey, file, {
      contentType: file.type,
      upsert: true,
    })
    if (uploadError) {
      setUploading(false)
      notify(t('photoError'))
      return
    }
    const { data: updated, error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_object_key: objectKey })
      .eq('id', userId)
      .select('id')
      .maybeSingle()
    if (profileError || !updated) {
      await supabase.storage.from('avatars').remove([objectKey])
      setUploading(false)
      notify(t('photoError'))
      return
    }
    const { data: signed, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(objectKey, 3600)
    setUploading(false)
    if (signedError || !signed) {
      notify(t('photoError'))
      router.refresh()
      return
    }
    setPhoto(signed.signedUrl)
    notify(t('photoSaved'))
    router.refresh()
  }

  async function switchLocale(value: string) {
    const nextLocale: Locale = value === 'Arabic' ? 'ar' : 'en'
    await updateLocalePreferenceAction(nextLocale)
    changeLocale(nextLocale)
  }

  return (
    <div className="settings-layout">
      <Panel className="settings-nav">
        <h2>{t('title')}</h2>
        <p>{t('subtitle')}</p>
        {tabs.map(([key, title, description, Icon]) => (
          <button className={tab === key ? 'selected' : ''} onClick={() => setTab(key)} key={key}>
            <Icon />
            <span><strong>{t(title)}</strong><small>{t(description)}</small></span>
          </button>
        ))}
      </Panel>
      <form key={`${tab}-${formVersion}`} className="panel settings-form" onSubmit={save}>
        <div className="settings-form-heading">
          <div><h1>{t(tabTitle)}</h1><p>{tab === 'Profile' ? t('profileSubtitle') : t('manageSelected', { item: t(tabTitle).toLowerCase() })}</p></div>
          {tab === 'Profile' && <div className="change-photo">
            {photo ? <Image className="avatar" src={photo} alt={t('profilePhotoAlt')} width={100} height={100} unoptimized /> : <Avatar large />}
            <div>
              <label className="btn outline">
                <Camera size={20} />{uploading ? t('uploadingPhoto') : t('changePhoto')}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  if (file) void uploadAvatar(file)
                  event.currentTarget.value = ''
                }} />
              </label>
              <small>{t('avatarFormats')}</small>
            </div>
          </div>}
        </div>

        {tab === 'Profile' ? <div className="form-grid">
          <Field label={t('fullName')} name="display_name" icon={User} value={displayName} required maxLength={120} />
          <Field label={t('email')} name="email" icon={Mail} type="email" value={email} readOnly dir="ltr" />
          <Field label={t('timezone')} name="timezone" icon={Globe} value={preferences.timezone} options={['UTC', 'Africa/Cairo', 'Europe/London', 'Asia/Karachi']} />
          <Field label={t('language')} name="Language" icon={Languages} value={locale === 'en' ? 'English (US)' : 'Arabic'} options={['English (US)', 'Arabic']} onChange={(event) => void switchLocale(event.currentTarget.value)} />
        </div> : tab === 'Account' ? <div className="form-grid">
          <Field label={t('accountEmail')} name="account_email" icon={Mail} type="email" value={email} readOnly dir="ltr" />
          <p>{t('accountEmailHelp')}</p>
          <strong>{t('deferredTitle')}</strong><p>{t('deferredCopy')}</p>
        </div> : tab === 'Security' ? <div className="preference-options">
          <p>{t('changePasswordHelp')}</p>
          <Link className="text-link" href="/forgot-password">{auth('forgotPassword')}</Link>
        </div> : isPreferencesTab ? <div className="preference-options">
          {(tab === 'Notifications' ? preferenceControls.slice(0, 4) : preferenceControls.slice(4)).map(({ key, label }) => (
            <label key={key}>
              <span><strong>{t(label)}</strong><p>{t('preferenceDescription', { item: t(label).toLowerCase() })}</p></span>
              <button type="button" role="switch" aria-label={t(label)} aria-checked={toggles[key]} className={`switch ${toggles[key] ? 'on' : ''}`} onClick={() => setToggles((current) => ({ ...current, [key]: !current[key] }))} />
            </label>
          ))}
        </div> : <div className="preference-options">
          <strong>{t('deferredTitle')}</strong><p>{t('deferredCopy')}</p>
        </div>}

        {editable && <div className="settings-buttons">
          <Button outline onClick={() => {
            setToggles({
              email_notifications: preferences.email_notifications,
              course_reminders: preferences.course_reminders,
              assignment_deadlines: preferences.assignment_deadlines,
              community_updates: preferences.community_updates,
              daily_learning_reminders: preferences.daily_learning_reminders,
              course_recommendations: preferences.course_recommendations,
              autoplay_next: preferences.autoplay_next,
            })
            setFormVersion((current) => current + 1)
          }}>{common('cancel')}</Button>
          <Button type="submit" disabled={saving || uploading}>{saving ? auth('sending') : common('save')}</Button>
        </div>}
      </form>
    </div>
  )
}
