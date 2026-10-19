"use server";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { parseDayKey, zonedTimeToUtc } from "../dates";
import type { CalendarEvent } from "../types";
import { getLearnerTimeZone, listCalendarEvents } from "./calendar";

const MAX_RANGE_MS = 120 * 24 * 60 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadCalendarEventsAction(
  fromIso: string,
  toIso: string,
): Promise<{ events: CalendarEvent[] } | { error: "invalid" | "failed" }> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    to <= from ||
    to.getTime() - from.getTime() > MAX_RANGE_MS
  )
    return { error: "invalid" };
  const locale = await getLocale();
  if (!isLocale(locale)) return { error: "invalid" };
  try {
    return { events: await listCalendarEvents(locale, from, to) };
  } catch {
    return { error: "failed" };
  }
}

export type StudySessionState = {
  error?: "invalid" | "limit" | "failed";
  success?: boolean;
};

/** Local date/time are interpreted in the learner's saved time zone on the server. */
export async function createStudySessionAction(
  _state: StudySessionState,
  form: FormData,
): Promise<StudySessionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "failed" };
  const title = String(form.get("title") ?? "").trim();
  const date = parseDayKey(String(form.get("date") ?? ""));
  const time = /^(\d{2}):(\d{2})$/.exec(String(form.get("time") ?? ""));
  const minutes = Number(form.get("duration"));
  if (
    !title ||
    title.length > 120 ||
    !date ||
    !time ||
    Number(time[1]) > 23 ||
    Number(time[2]) > 59 ||
    !Number.isInteger(minutes) ||
    minutes < 15 ||
    minutes > 480
  )
    return { error: "invalid" };
  const timeZone = await getLearnerTimeZone(user.id);
  const startsAt = zonedTimeToUtc(
    date,
    Number(time[1]),
    Number(time[2]),
    timeZone,
  );
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  const { error } = await (
    await createClient()
  ).rpc("learner_create_study_session", {
    p_title: title,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
  });
  if (error)
    return {
      error:
        error.code === "54000"
          ? "limit"
          : error.code === "22023"
            ? "invalid"
            : "failed",
    };
  return { success: true };
}

export async function deleteStudySessionAction(
  id: string,
): Promise<"deleted" | "failed"> {
  if (!UUID_PATTERN.test(id)) return "failed";
  const { error } = await (
    await createClient()
  ).rpc("learner_delete_study_session", { p_id: id });
  return error ? "failed" : "deleted";
}
