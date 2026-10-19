import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { VideoManagement } from "@/features/learning/components/video-management";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminVideosPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  // The layout renders the denied state; never query on behalf of a non-admin.
  if ((await getAdminAccess()).status !== "admin") return null;
  const admin = await getTranslations("admin");
  const { data, error } = await (await createClient()).rpc("mux_list_manageable_lessons", { p_locale: locale });
  if (error) throw new Error("Video management is unavailable.");
  // Only preselects a lesson already in the manageable list; anything else falls back to the first.
  return <VideoManagement lessons={data ?? []} initialLessonId={query.lesson} eyebrow={admin("nav.groups.content")} />;
}
