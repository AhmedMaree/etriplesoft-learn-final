import type { ReactNode } from "react";
import { LearnerShell } from "@/components/layout/learner-shell";
import { SiteFooter } from "@/features/marketing/components/site-footer";
import "@/features/marketing/styles/base.css";
import "@/features/marketing/styles/shell.css";
import { isLocale } from '@/i18n/config'
import { getCurrentUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getLearningSummary, type LearningSummary } from '@/features/learning/server/summary'

export default async function LearnerLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: value } = await params
  if (!isLocale(value)) notFound()
  const user = await getCurrentUser()
  let displayName: string | null = null
  let avatarUrl: string | null = null
  let continueLearning: LearningSummary['courses'][number] | null = null
  if (user) {
    const supabase = await createClient()
    const { data: profile } = await supabase.from('profiles').select('display_name, avatar_object_key').eq('id', user.id).maybeSingle()
    displayName = profile?.display_name ?? null
    if (profile?.avatar_object_key?.startsWith(`${user.id}/`)) {
      const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_object_key, 3600)
      avatarUrl = data?.signedUrl ?? null
    }
    try {
      const summary = await getLearningSummary(value)
      continueLearning = summary.courses.find((course) => course.status === 'active') ?? null
    } catch {
      continueLearning = null
    }
  }
  return <LearnerShell locale={value} displayName={displayName} avatarUrl={avatarUrl} authenticated={Boolean(user)} continueLearning={continueLearning} footer={<div className="mk mk--embedded"><SiteFooter localeSwitcher /></div>}>{children}</LearnerShell>
}
