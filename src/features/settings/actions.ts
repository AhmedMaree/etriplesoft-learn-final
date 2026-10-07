'use server'

import { createClient } from '@/lib/supabase/server'

const preferenceKeys = [
  'email_notifications',
  'course_reminders',
  'assignment_deadlines',
  'community_updates',
  'daily_learning_reminders',
  'course_recommendations',
  'autoplay_next',
] as const

type PreferenceKey = (typeof preferenceKeys)[number]

export async function saveSettingsAction(input: unknown): Promise<'saved' | 'invalid' | 'failed'> {
  if (typeof input !== 'object' || input === null) return 'invalid'
  const value = input as Record<string, unknown>
  const displayName = typeof value.displayName === 'string' ? value.displayName.trim() : ''
  const timezone = typeof value.timezone === 'string' ? value.timezone : ''
  if (displayName.length < 1 || displayName.length > 120) return 'invalid'
  if (!['UTC', 'Africa/Cairo', 'Europe/London', 'Asia/Karachi'].includes(timezone)) return 'invalid'
  if (typeof value.preferences !== 'object' || value.preferences === null || Array.isArray(value.preferences)) return 'invalid'

  const rawPreferences = value.preferences as Record<string, unknown>
  const preferences: Partial<Record<PreferenceKey, boolean>> = {}
  for (const key of preferenceKeys) {
    if (typeof rawPreferences[key] !== 'boolean') return 'invalid'
    preferences[key] = rawPreferences[key]
  }
  if (Object.keys(rawPreferences).some((key) => !preferenceKeys.includes(key as PreferenceKey))) return 'invalid'

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data.user) return 'failed'

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', data.user.id)
  if (profileError) return 'failed'

  const { error: preferencesError } = await supabase
    .from('learner_preferences')
    .update({ timezone, ...preferences })
    .eq('user_id', data.user.id)
  return preferencesError ? 'failed' : 'saved'
}
