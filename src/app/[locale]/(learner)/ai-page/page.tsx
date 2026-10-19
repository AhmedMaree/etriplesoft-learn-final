import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/i18n/page-metadata";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeading } from "@/components/layout/page-heading";
import { AIPage } from "@/features/ai-assistant/components/ai-page";
import { listContextCourses } from "@/features/ai-assistant/server/context";
import { getInsights, listConversations } from "@/features/ai-assistant/server/conversations";
import { isGeminiConfigured } from "@/features/ai-assistant/server/gemini";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "ai", "/ai-page");
}

export default async function AIAssistantRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireAuthenticatedUser(locale, `/${locale}/ai-page`);
  const client = await createClient();
  const [courses, conversations, insights, profile] = await Promise.all([
    listContextCourses(client, locale),
    listConversations(client).catch(() => []),
    getInsights(client),
    client.from("profiles").select("avatar_object_key").eq("id", user.id).maybeSingle(),
  ]);
  const avatarKey = profile.data?.avatar_object_key;
  const avatarUrl = avatarKey?.startsWith(`${user.id}/`)
    ? ((await client.storage.from("avatars").createSignedUrl(avatarKey, 3600)).data?.signedUrl ?? null)
    : null;
  return (
    <>
      <PageHeading
        page="ai-page"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <AIPage
        configured={isGeminiConfigured()}
        courses={courses}
        initialConversations={conversations}
        insights={insights}
        avatarUrl={avatarUrl}
      />
    </>
  );
}
