import "server-only";
import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { safeTimeZone } from "../dates";
import {
  COURSE_EVENT_KINDS,
  type CalendarEvent,
  type CalendarEventKind,
  type LearningStreak,
} from "../types";

const KINDS: readonly string[] = [...COURSE_EVENT_KINDS, "study"];

/** Learner calendar rows for a bounded window; the database checks the caller and entitlement. */
export async function listCalendarEvents(
  locale: Locale,
  from: Date,
  to: Date,
): Promise<CalendarEvent[]> {
  const client = await createClient();
  const { data, error } = await client.rpc("learner_calendar_events", {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_locale: locale,
  });
  if (error) throw new Error("Calendar unavailable.");
  return (data ?? [])
    .filter((row) => KINDS.includes(row.kind))
    .map((row) => ({
      id: row.id,
      source: row.source === "personal" ? "personal" : "course",
      kind: row.kind as CalendarEventKind,
      status: row.status === "cancelled" ? "cancelled" : "scheduled",
      title: row.title ?? null,
      description: row.description ?? null,
      courseSlug: row.course_slug ?? null,
      courseTitle: row.course_title ?? null,
      lessonId: row.lesson_id ?? null,
      startsAt: row.starts_at,
      endsAt: row.ends_at ?? null,
      meetingUrl: row.meeting_url ?? null,
    }));
}

function isStreak(value: unknown): value is LearningStreak {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.current === "number" &&
    typeof v.longest === "number" &&
    typeof v.totalDays === "number" &&
    typeof v.today === "string" &&
    typeof v.activeToday === "boolean" &&
    Array.isArray(v.week) &&
    v.week.every(
      (d) => d && typeof d.date === "string" && typeof d.active === "boolean",
    )
  );
}

// Memoized per request: the dashboard, calendar and certificates pages share it.
export const getLearningStreak = cache(
  async (): Promise<LearningStreak | null> => {
    const { data, error } = await (
      await createClient()
    ).rpc("learner_learning_streak");
    return !error && isStreak(data) ? data : null;
  },
);

/** The signed-in learner's saved time zone (validated), used for every calendar day boundary. */
export const getLearnerTimeZone = cache(
  async (userId: string): Promise<string> => {
    const { data } = await (
      await createClient()
    )
      .from("learner_preferences")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    return safeTimeZone(data?.timezone);
  },
);
