import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { isLocale } from '@/i18n/config'
import { notFound } from 'next/navigation'
import { requireAuthenticatedUser } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "settings", "/settings");
}

export default async function SettingsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: value } = await params
  if (!isLocale(value)) notFound()
  const user = await requireAuthenticatedUser(value, `/${value}/settings`)
  const supabase = await createClient()
  const [{ data: profile, error: profileError }, { data: preferences, error: preferencesError }] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_object_key').eq('id', user.id).single(),
    supabase.from('learner_preferences').select('*').eq('user_id', user.id).single(),
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
      <SettingsPage userId={user.id} email={user.email ?? ''} displayName={profile.display_name ?? ''} avatarUrl={avatarUrl} preferences={preferences} locale={value} />
    </>
  );
}
