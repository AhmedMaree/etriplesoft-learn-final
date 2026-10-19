import { notFound, redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getAdminAccess, requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { VideoManagement } from "@/features/learning/components/video-management";
import "@/features/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function VideoManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireAuthenticatedUser(locale, `/${locale}/video-management`);
  // Administrators manage videos inside the admin console; assigned instructors stay here.
  if ((await getAdminAccess()).status === "admin") {
    const lesson = query.lesson && /^[0-9a-f-]{36}$/i.test(query.lesson) ? `?lesson=${query.lesson}` : "";
    redirect(`/${locale}/admin/videos${lesson}`);
  }
  const client = await createClient();
  const { data, error } = await client.rpc("mux_list_manageable_lessons", {
    p_locale: locale,
  });
  if (error) throw new Error("Video management is unavailable.");
  return <VideoManagement lessons={data ?? []} initialLessonId={query.lesson} />;
}
