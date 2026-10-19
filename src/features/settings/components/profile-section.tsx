'use client'

import { useMemo, useState, useSyncExternalStore, type FormEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Camera, Globe, Languages, LocateFixed, Mail, Trash2, User, GraduationCap, Building2, Briefcase, Calendar } from 'lucide-react'
import { Avatar } from '@/components/shared/profile-avatar'
import { Field } from '@/components/ui/field'
import { useDemoToast } from '@/lib/browser/demo-toast'
import { createClient } from '@/lib/supabase/client'
import { useLocaleChange } from '@/i18n/use-locale-change'
import { updateLocalePreferenceAction } from '@/features/auth/actions'
import { removeAvatarAction, saveSettingsAction } from '@/features/settings/actions'
import { listTimeZones } from '@/features/settings/timezones'
import type { Database } from '@/types/database'
import type { Locale } from '@/i18n/config'
import type { LearnerDetails } from '@/features/settings/tabs'
import { FACULTIES, UNIVERSITIES } from '@/features/auth/academic-options'
import { ChoiceOrOtherField } from '@/features/auth/components/choice-or-other-field'
import { SettingsButtons } from './settings-buttons'

type LearnerPreferences = Database['public']['Tables']['learner_preferences']['Row']

const subscribeNever = () => () => {}

export function AvatarControl({ userId, avatarUrl }: { userId: string; avatarUrl: string | null }) {
  const t = useTranslations('settings')
  const notify = useDemoToast()
  const router = useRouter()
  const [photo, setPhoto] = useState(avatarUrl)
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)

  async function upload(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      notify(t('invalidImage'))
      return
    }
    setBusy('upload')
    const supabase = createClient()
    const objectKey = `${userId}/avatar`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(objectKey, file, {
      contentType: file.type,
      upsert: true,
    })
    if (uploadError) {
      setBusy(null)
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
      setBusy(null)
      notify(t('photoError'))
      return
    }
    const { data: signed, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(objectKey, 3600)
    setBusy(null)
    if (signedError || !signed) {
      notify(t('photoError'))
      router.refresh()
      return
    }
    setPhoto(signed.signedUrl)
    notify(t('photoSaved'))
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(t('removePhotoConfirm'))) return
    setBusy('remove')
    const result = await removeAvatarAction()
    setBusy(null)
    if (result !== 'removed') {
      notify(t('photoError'))
      return
    }
    setPhoto(null)
    notify(t('photoRemoved'))
    router.refresh()
  }

  return (
    <div className="change-photo">
      {photo ? <Image className="avatar" src={photo} alt={t('profilePhotoAlt')} width={100} height={100} unoptimized /> : <Avatar large alt={t('profilePhotoAlt')} />}
      <div>
        <label className={`btn outline ${busy ? 'is-busy' : ''}`} aria-disabled={busy !== null || undefined}>
          <Camera size={20} aria-hidden="true" />{busy === 'upload' ? t('uploadingPhoto') : t('changePhoto')}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy !== null} onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) void upload(file)
            event.currentTarget.value = ''
          }} />
        </label>
        {photo && (
          <button type="button" className="text-button danger" onClick={() => void remove()} disabled={busy !== null}>
            <Trash2 size={15} aria-hidden="true" />{busy === 'remove' ? t('removingPhoto') : t('removePhoto')}
          </button>
        )}
        <small>{t('avatarFormats')}</small>
      </div>
    </div>
  )
}

export function ProfileSection({
  email,
  displayName,
  preferences,
  learnerProfile,
  locale,
  onDirtyChange,
}: {
  email: string
  displayName: string
  preferences: LearnerPreferences
  learnerProfile: LearnerDetails | null
  locale: Locale
  onDirtyChange: (dirty: boolean) => void
}) {
  const t = useTranslations('settings')
  const auth = useTranslations('auth')
  const common = useTranslations('common')
  const notify = useDemoToast()
  const router = useRouter()
  const { changeLocale } = useLocaleChange()
  const [version, setVersion] = useState(0)
  const [dirty, setDirtyState] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [timezone, setTimezone] = useState(preferences.timezone)
  const editableType = learnerProfile && (learnerProfile.learner_type === 'student' || learnerProfile.learner_type === 'professional')
  const [learnerType, setLearnerType] = useState(learnerProfile?.learner_type ?? null)
  // The server and browser ICU data can list different zones, so the full list is only
  // rendered after hydration; the server renders just the saved zone.
  const browserZones = useSyncExternalStore(subscribeNever, listTimeZones, () => null)
  const timeZones = useMemo(() => {
    const zones = browserZones ?? []
    const withSaved = zones.includes(preferences.timezone) ? zones : [preferences.timezone, ...zones]
    return withSaved.includes(timezone) ? withSaved : [timezone, ...withSaved]
  }, [browserZones, preferences.timezone, timezone])

  function setDirty(value: boolean) {
    setDirtyState(value)
    onDirtyChange(value)
  }

  function reset() {
    setTimezone(preferences.timezone)
    setLearnerType(learnerProfile?.learner_type ?? null)
    setError('')
    setDirty(false)
    setVersion((current) => current + 1)
  }

  function detectTimeZone() {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!detected || detected === timezone) {
      notify(t('timezoneAlreadyDetected'))
      return
    }
    setTimezone(detected)
    setDirty(true)
  }

  async function switchLocale(value: string) {
    if (value !== 'en' && value !== 'ar') return
    await updateLocalePreferenceAction(value)
    changeLocale(value)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (name: string) => (data.has(name) ? String(data.get(name)) : '')
    const learnerDetails = editableType
      ? learnerType === 'student'
        ? { learnerType, university: field('university'), faculty: field('faculty'), birthYear: field('birth_year'), graduationYear: field('graduation_year') }
        : { learnerType, jobTitle: field('job_title'), companyName: field('company_name'), yearsExperience: field('years_experience') }
      : undefined
    setSaving(true)
    setError('')
    const result = await saveSettingsAction({
      displayName: field('display_name'),
      timezone,
      learnerProfile: learnerDetails,
      preferences: {
        email_notifications: preferences.email_notifications,
        course_reminders: preferences.course_reminders,
        assignment_deadlines: preferences.assignment_deadlines,
        community_updates: preferences.community_updates,
        daily_learning_reminders: preferences.daily_learning_reminders,
        course_recommendations: preferences.course_recommendations,
        autoplay_next: preferences.autoplay_next,
      },
    })
    setSaving(false)
    if (result === 'saved') {
      setDirty(false)
      notify(t('saved'))
      router.refresh()
      return
    }
    const message = result === 'invalid' ? t('profileInvalid') : t('saveError')
    setError(message)
    notify(message)
  }

  return (
    <form
      key={version}
      className="settings-section"
      onSubmit={save}
      onChange={(event) => {
        if ((event.target as HTMLElement).getAttribute('name') !== 'locale') setDirty(true)
      }}
    >
      <div className="form-grid">
        <Field label={t('fullName')} name="display_name" icon={User} value={displayName} required maxLength={120} autoComplete="name" />
        <Field label={t('email')} name="email" icon={Mail} type="email" value={email} readOnly dir="ltr" />
        <div className="field">
          <label htmlFor="settings-timezone">{t('timezone')}</label>
          <div className="input-wrap">
            <Globe size={20} aria-hidden="true" />
            <select id="settings-timezone" name="timezone" value={timezone} dir="ltr" onChange={(event) => setTimezone(event.currentTarget.value)}>
              {timeZones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <button type="button" className="text-button" onClick={detectTimeZone}>
            <LocateFixed size={15} aria-hidden="true" />{t('detectTimezone')}
          </button>
        </div>
        <div className="field">
          <label htmlFor="settings-locale">{t('language')}</label>
          <div className="input-wrap">
            <Languages size={20} aria-hidden="true" />
            <select id="settings-locale" name="locale" defaultValue={locale} aria-describedby="settings-locale-help" onChange={(event) => void switchLocale(event.currentTarget.value)}>
              <option value="en">{common('englishUs')}</option>
              <option value="ar">{common('arabic')}</option>
            </select>
          </div>
          <small id="settings-locale-help" className="field-help">{t('languageHelp')}</small>
        </div>
      </div>

      {learnerProfile && (
        <div className="settings-subsection">
          <h2>{t('learnerDetails')}</h2>
          <p>{t('learnerDetailsCopy')}</p>
          {editableType ? (
            <>
              <div className="learner-type-options" role="radiogroup" aria-label={auth('learnerTypePrompt')}>
                {(['student', 'professional'] as const).map((type) => (
                  <label key={type} className={learnerType === type ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="learner_type"
                      value={type}
                      checked={learnerType === type}
                      onChange={() => setLearnerType(type)}
                    />
                    {type === 'student' ? <GraduationCap size={18} aria-hidden="true" /> : <Briefcase size={18} aria-hidden="true" />}
                    {auth(`${type}.label`)}
                  </label>
                ))}
              </div>
              {learnerType === 'student' ? (
                <div className="form-grid">
                  <ChoiceOrOtherField label={auth('university')} name="university" icon={GraduationCap} options={UNIVERSITIES} value={learnerProfile.university ?? ''} selectPlaceholder={auth('selectUniversity')} otherLabel={auth('other')} otherInputLabel={auth('otherUniversity')} otherPlaceholder={auth('universityExample')} required maxLength={120} />
                  <ChoiceOrOtherField label={auth('faculty')} name="faculty" icon={Building2} options={FACULTIES} value={learnerProfile.faculty ?? ''} selectPlaceholder={auth('selectFaculty')} otherLabel={auth('other')} otherInputLabel={auth('otherFaculty')} otherPlaceholder={auth('facultyExample')} required maxLength={120} />
                  <Field label={auth('birthYear')} name="birth_year" icon={Calendar} type="number" value={learnerProfile.birth_year?.toString() ?? ''} placeholder={auth('birthYearExample')} min={1900} max={new Date().getFullYear()} />
                  <Field label={auth('graduationYear')} name="graduation_year" icon={Calendar} type="number" value={learnerProfile.graduation_year?.toString() ?? ''} placeholder={auth('graduationYearExample')} min={1900} max={2100} />
                </div>
              ) : (
                <div className="form-grid">
                  <Field label={auth('jobTitle')} name="job_title" icon={Briefcase} value={learnerProfile.job_title ?? ''} placeholder={auth('jobTitleExample')} maxLength={120} />
                  <Field label={auth('companyName')} name="company_name" icon={Building2} value={learnerProfile.company_name ?? ''} placeholder={auth('companyNameExample')} maxLength={120} />
                  <Field label={auth('yearsExperience')} name="years_experience" icon={Calendar} type="number" value={learnerProfile.years_experience?.toString() ?? ''} placeholder={auth('yearsExperienceExample')} min={0} max={60} />
                </div>
              )}
            </>
          ) : (
            <p className="settings-note">{t('companyLearnerNote')}</p>
          )}
        </div>
      )}

      {error && <p className="settings-message error" role="alert">{error}</p>}
      <SettingsButtons dirty={dirty} saving={saving} onCancel={reset} />
    </form>
  )
}
