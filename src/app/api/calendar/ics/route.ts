import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { courseHref } from "@/features/courses/components/course-links";
import { listCalendarEvents } from "@/features/calendar/server/calendar";
import { buildIcsCalendar } from "@/features/calendar/ics";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

// The signed-in learner's own calendar as a one-time import file. Reads use the learner's session,
// so the database limits it to entitled course events and their own study sessions.
export async function GET(request: NextRequest) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return NextResponse.json({}, { status: 401, headers });
  const requested = request.nextUrl.searchParams.get("locale") ?? "en";
  const locale = isLocale(requested) ? requested : "en";
  const now = new Date();
  let events;
  try {
    events = await listCalendarEvents(
      locale,
      new Date(now.getTime() - 30 * DAY),
      new Date(now.getTime() + 365 * DAY),
    );
  } catch {
    return NextResponse.json({}, { status: 503, headers });
  }
  const t = await getTranslations({ locale, namespace: "calendar" });
  let origin: string | null = null;
  try {
    origin = process.env.AUTH_SITE_URL
      ? new URL(process.env.AUTH_SITE_URL).origin
      : null;
  } catch {
    origin = null;
  }
  const body = buildIcsCalendar(events, {
    now,
    host: "learn.etriplesoft.com",
    titleFor: (event) => event.title ?? t(`kinds.${event.kind}`),
    courseUrl: (event) =>
      origin && event.courseSlug
        ? `${origin}/${locale}${courseHref(event.courseSlug)}`
        : null,
  });
  return new NextResponse(body, {
    headers: {
      ...headers,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="etriplesoft-learning.ics"',
    },
  });
}
