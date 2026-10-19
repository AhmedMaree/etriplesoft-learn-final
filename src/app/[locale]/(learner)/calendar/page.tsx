import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { createPageMetadata } from "@/i18n/page-metadata";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { PageHeading } from "@/components/layout/page-heading";
import { CalendarPage } from "@/features/calendar/components/calendar-page";
import { civilDateOf, dayKey } from "@/features/calendar/dates";
import { rangeFor } from "@/features/calendar/grid";
import {
  getLearnerTimeZone,
  getLearningStreak,
  listCalendarEvents,
} from "@/features/calendar/server/calendar";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return createPageMetadata(params, "calendar", "/calendar");
}

export default async function CalendarRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireAuthenticatedUser(locale, `/${locale}/calendar`);
  const timeZone = await getLearnerTimeZone(user.id);
  const now = new Date();
  const today = civilDateOf(now, timeZone);
  const range = rangeFor("month", today, timeZone);
  const [events, upcoming, streak] = await Promise.all([
    listCalendarEvents(locale, new Date(range.from), new Date(range.to)),
    listCalendarEvents(locale, now, new Date(now.getTime() + 8 * 86_400_000)),
    getLearningStreak(),
  ]);
  return (
    <>
      <PageHeading
        page="calendar"
        title="Stay on track with your learning!"
        subtitle="View your classes, live sessions, deadlines, and important events all in one place."
      />
      <CalendarPage
        timeZone={timeZone}
        todayKey={dayKey(today)}
        nowIso={now.toISOString()}
        initial={{ ...range, events }}
        initialUpcoming={upcoming}
        streak={streak}
      />
    </>
  );
}
