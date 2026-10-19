import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/i18n/page-metadata";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { PageHeading } from "@/components/layout/page-heading";
import { getLearnerTimeZone } from "@/features/calendar/server/calendar";
import { MessagesPage } from "@/features/messages/components/messages-page";
import {
  getInboxSummary,
  listCourseOptions,
  listThreads,
} from "@/features/messages/server/messages";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return createPageMetadata(params, "messages", "/messages");
}

export default async function MessagesRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireAuthenticatedUser(locale, `/${locale}/messages`);
  const query = await searchParams;
  const one = (key: string) =>
    typeof query[key] === "string" ? (query[key] as string) : null;
  const thread = one("thread");
  const newCourse = one("new");

  const [summary, courses, timeZone] = await Promise.all([
    getInboxSummary(),
    listCourseOptions(locale),
    getLearnerTimeZone(user.id),
  ]);
  // The staff box is only offered to callers the database recognizes as staff.
  const box = one("box") === "staff" && summary.isStaff ? "staff" : "mine";
  const page = await listThreads(locale, box, "all", "").catch(() => null);

  return (
    <>
      <PageHeading
        page="messages"
        title="Messages"
        subtitle="Talk to your instructors and the ETripleSoft team."
      />
      <MessagesPage
        // A notification link to another conversation starts from that conversation.
        key={`${box}:${thread ?? ""}:${newCourse ?? ""}`}
        timeZone={timeZone}
        initialBox={box}
        initialThreads={page?.threads ?? []}
        initialHasMore={page?.hasMore ?? false}
        initialSummary={summary}
        initialThreadId={thread && UUID_PATTERN.test(thread) ? thread : null}
        courses={courses}
        // ?new=support or ?new=<course slug> (from a course page) opens the new-message dialog.
        initialCompose={
          newCourse === null
            ? null
            : newCourse === "support"
              ? { topic: "support", courseId: null }
              : {
                  topic: "course",
                  courseId:
                    courses.find((c) => c.slug === newCourse)?.id ?? null,
                }
        }
        loadFailed={page === null}
      />
    </>
  );
}
