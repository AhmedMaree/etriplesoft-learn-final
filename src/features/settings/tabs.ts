export const settingsTabs = ['profile', 'account', 'security', 'notifications', 'learning', 'ai'] as const

export type SettingsTab = (typeof settingsTabs)[number]

export function isSettingsTab(value: string): value is SettingsTab {
  return (settingsTabs as readonly string[]).includes(value)
}

export const preferenceKeys = [
  'email_notifications',
  'course_reminders',
  'assignment_deadlines',
  'community_updates',
  'daily_learning_reminders',
  'course_recommendations',
  'autoplay_next',
] as const

export type PreferenceKey = (typeof preferenceKeys)[number]

export type LearnerDetails = {
  learner_type: string
  birth_year: number | null
  university: string | null
  faculty: string | null
  graduation_year: number | null
  job_title: string | null
  company_name: string | null
  years_experience: number | null
}

export type AccountSummary = {
  email: string
  pendingEmail: string | null
  emailConfirmedAt: string | null
  createdAt: string
  lastSignInAt: string | null
}
