import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { VideoManagement } from "@/features/learning/components/video-management";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function VideoManagementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  await requireAuthenticatedUser(locale, `/${locale}/video-management`);
  const client = await createClient();
  const { data, error } = await client.rpc("mux_list_manageable_lessons", {
    p_locale: locale,
  });
  if (error) throw new Error("Video management is unavailable.");
  return <VideoManagement lessons={data ?? []} />;
}
