import type { ReactNode } from "react";
import { LearnerShell } from "@/components/layout/learner-shell";
import "@/features/marketing/styles/base.css";
import "@/features/marketing/styles/shell.css";
import { isLocale } from '@/i18n/config'
import { getCurrentUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getLearningSummary, type LearningSummary } from '@/features/learning/server/summary'
import { getLearnerTimeZone } from '@/features/calendar/server/calendar'
import { syncAndCountNotifications } from '@/features/notifications/server/notifications'
import { listSchedulableCourses } from '@/features/calendar/server/staff'
import { getInboxSummary } from '@/features/messages/server/messages'
import { isGeminiConfigured } from '@/features/ai-assistant/server/gemini'

export default async function LearnerLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: value } = await params
  if (!isLocale(value)) notFound()
  const user = await getCurrentUser()
  let displayName: string | null = null
  let avatarUrl: string | null = null
  let continueLearning: LearningSummary['courses'][number] | null = null
  let isAdmin = false
  let canSchedule = false
  let hasOrganization = false
  let unreadNotifications = 0
  let unreadMessages = 0
  let timeZone = 'UTC'
  if (user) {
    const supabase = await createClient()
    // Independent reads run together; only the avatar URL waits on the profile.
    const [{ data: profile }, count, zone, summary, { data: roles }, inbox, organizations, invitations] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_object_key').eq('id', user.id).maybeSingle(),
      // Creates any due reminders, so the bell's count is current on every full page load.
      syncAndCountNotifications().catch(() => 0),
      getLearnerTimeZone(user.id),
      getLearningSummary(value).catch(() => null),
      // Only decides which shortcuts to show; the admin area and staff pages re-check roles themselves.
      supabase.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'instructor']).is('revoked_at', null),
      getInboxSummary(),
      // Organization members, managers and invitees see the organization link.
      supabase.rpc('learner_list_organizations'),
      supabase.rpc('learner_list_invitations'),
    ])
    // Any active admin role keeps the shortcut, even for a stale or not-yet-MFA-verified session; the
    // admin area asks for the rest. This equals getAdminAccess() reporting admin or a pending status.
    isAdmin = Boolean(roles?.some((row) => row.role === 'admin'))
    displayName = profile?.display_name ?? null
    if (profile?.avatar_object_key?.startsWith(`${user.id}/`)) {
      const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_object_key, 3600)
      avatarUrl = data?.signedUrl ?? null
    }
    unreadNotifications = count
    unreadMessages = inbox.unreadMine + inbox.unreadStaff
    hasOrganization = Boolean(organizations.data?.length || invitations.data?.length)
    timeZone = zone
    continueLearning = summary?.courses.find((course) => course.status === 'active') ?? null
    // Instructors (not admins, who use the admin area) see the schedule link once a course is assigned.
    canSchedule = !isAdmin && Boolean(roles?.some((row) => row.role === 'instructor')) && (await listSchedulableCourses(value)).courses.length > 0
  }
  return <LearnerShell locale={value} displayName={displayName} avatarUrl={avatarUrl} authenticated={Boolean(user)} continueLearning={continueLearning} isAdmin={isAdmin} canSchedule={canSchedule} hasOrganization={hasOrganization} unreadNotifications={unreadNotifications} unreadMessages={unreadMessages} timeZone={timeZone} assistantAvailable={isGeminiConfigured()}>{children}</LearnerShell>
}
