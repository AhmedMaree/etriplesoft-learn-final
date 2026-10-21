import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { isSettingsTab } from "@/features/settings/tabs";
import { isLocale } from '@/i18n/config'
import { notFound } from 'next/navigation'
import { requireAccountUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'
import '@/features/placement/placement.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "settings", "/settings");
}

export default async function SettingsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const { locale: value } = await params
  if (!isLocale(value)) notFound()
  const { tab } = await searchParams
  const user = await requireAccountUser(value, `/${value}/settings`)
  const supabase = await createClient()
  const [
    { data: profile, error: profileError },
    { data: preferences, error: preferencesError },
    { data: learnerProfile },
  ] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_object_key, created_at').eq('id', user.id).single(),
    supabase.from('learner_preferences').select('*').eq('user_id', user.id).single(),
    supabase
      .from('learner_profiles')
      .select('learner_type, birth_year, university, faculty, graduation_year, job_title, company_name, years_experience')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])
  if (profileError || preferencesError || !preferences) throw new Error('Could not load the signed-in learner settings.')
  let avatarUrl: string | null = null
  if (profile.avatar_object_key?.startsWith(`${user.id}/`)) {
    const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_object_key, 3600)
    avatarUrl = data?.signedUrl ?? null
  }
  return (
    <>
      <PageHeading
        page="settings"
        title="Settings"
        subtitle="Manage your account, preferences, and learning experience."
      />
      <SettingsPage
        userId={user.id}
        account={{
          email: user.email ?? '',
          pendingEmail: user.new_email ?? null,
          emailConfirmedAt: user.email_confirmed_at ?? null,
          createdAt: profile.created_at ?? user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
        }}
        displayName={profile.display_name ?? ''}
        avatarUrl={avatarUrl}
        preferences={preferences}
        learnerProfile={learnerProfile ?? null}
        locale={value}
        initialTab={typeof tab === 'string' && isSettingsTab(tab) ? tab : 'profile'}
      />
    </>
  );
}
