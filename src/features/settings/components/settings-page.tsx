'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Sparkles, Bell, BarChart3, User, Lock, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Panel } from '@/components/ui/primitives'
import type { Database } from '@/types/database'
import type { Locale } from '@/i18n/config'
import { settingsTabs, type AccountSummary, type LearnerDetails, type SettingsTab } from '@/features/settings/tabs'
import { AvatarControl, ProfileSection } from './profile-section'
import { AccountSection } from './account-section'
import { SecuritySection } from './security-section'
import { PreferencesSection } from './preferences-section'
import { AiSection } from './ai-section'

type LearnerPreferences = Database['public']['Tables']['learner_preferences']['Row']

const tabMeta = {
  profile: { title: 'profile', description: 'profileDescription', subtitle: 'profileSubtitle', icon: User },
  account: { title: 'account', description: 'accountDescription', subtitle: 'accountSubtitle', icon: CreditCard },
  security: { title: 'security', description: 'securityDescription', subtitle: 'securitySubtitle', icon: Lock },
  notifications: { title: 'notifications', description: 'notificationsDescription', subtitle: 'notificationsSubtitle', icon: Bell },
  learning: { title: 'learningPreferences', description: 'learningDescription', subtitle: 'learningSubtitle', icon: BarChart3 },
  ai: { title: 'aiPreferences', description: 'aiDescription', subtitle: 'aiSubtitle', icon: Sparkles },
} as const

export function SettingsPage({
  userId,
  account,
  displayName,
  avatarUrl,
  preferences,
  learnerProfile,
  locale,
  initialTab,
}: {
  userId: string
  account: AccountSummary
  displayName: string
  avatarUrl: string | null
  preferences: LearnerPreferences
  learnerProfile: LearnerDetails | null
  locale: Locale
  initialTab: SettingsTab
}) {
  const t = useTranslations('settings')
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [dirty, setDirty] = useState(false)
  const tabRefs = useRef<Partial<Record<SettingsTab, HTMLButtonElement | null>>>({})

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function selectTab(next: SettingsTab) {
    if (next === tab) return
    if (dirty && !window.confirm(t('discardConfirm'))) return
    setDirty(false)
    setTab(next)
    // Keep the open tab shareable and restorable on reload without a navigation.
    const url = new URL(window.location.href)
    if (next === 'profile') url.searchParams.delete('tab')
    else url.searchParams.set('tab', next)
    window.history.replaceState(window.history.state, '', url)
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = settingsTabs.indexOf(tab)
    const keys: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: settingsTabs.length - 1,
    }
    if (!(event.key in keys)) return
    event.preventDefault()
    const next = settingsTabs[(keys[event.key] + settingsTabs.length) % settingsTabs.length]
    selectTab(next)
    tabRefs.current[next]?.focus()
  }

  const meta = tabMeta[tab]

  return (
    <div className="settings-layout">
      <Panel className="settings-nav">
        <p className="settings-nav-title">{t('title')}</p>
        <p>{t('subtitle')}</p>
        <div role="tablist" aria-orientation="vertical" aria-label={t('title')}>
          {settingsTabs.map((key) => {
            const { title, description, icon: Icon } = tabMeta[key]
            return (
              <button
                key={key}
                ref={(element) => { tabRefs.current[key] = element }}
                id={`settings-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={tab === key}
                aria-controls="settings-panel"
                tabIndex={tab === key ? 0 : -1}
                className={tab === key ? 'selected' : ''}
                onClick={() => selectTab(key)}
                onKeyDown={onTabKeyDown}
              >
                <Icon aria-hidden="true" />
                <span><strong>{t(title)}</strong><small>{t(description)}</small></span>
              </button>
            )
          })}
        </div>
      </Panel>
      <section id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${tab}`} className="panel settings-form">
        <div className="settings-form-heading">
          <div><h1>{t(meta.title)}</h1><p>{t(meta.subtitle)}</p></div>
          {tab === 'profile' && <AvatarControl userId={userId} avatarUrl={avatarUrl} />}
        </div>
        {tab === 'profile' ? (
          <ProfileSection
            email={account.email}
            displayName={displayName}
            preferences={preferences}
            learnerProfile={learnerProfile}
            locale={locale}
            onDirtyChange={setDirty}
          />
        ) : tab === 'account' ? (
          <AccountSection account={account} learnerType={learnerProfile?.learner_type ?? null} timezone={preferences.timezone} locale={locale} />
        ) : tab === 'security' ? (
          <SecuritySection lastSignInAt={account.lastSignInAt} timezone={preferences.timezone} locale={locale} />
        ) : tab === 'notifications' || tab === 'learning' ? (
          <PreferencesSection key={tab} group={tab} preferences={preferences} onDirtyChange={setDirty} />
        ) : (
          <AiSection />
        )}
      </section>
    </div>
  )
}
