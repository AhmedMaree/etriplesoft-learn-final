"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import type { AdminActionState } from "@/features/admin/action-state";
import { parseDayKey, zonedTimeToUtc } from "../dates";
import { COURSE_EVENT_KINDS, isDueKind, type CourseEventKind } from "../types";
import { getLearnerTimeZone } from "./calendar";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Stable message keys under courseEvents.errors; authority is enforced inside each RPC.
function errorKey(error: { code?: string }) {
  if (error.code === "42501") return "denied";
  if (error.code === "P0002") return "missing";
  if (error.code === "22023" || error.code === "23514") return "invalid";
  return "failed";
}

function refresh() {
  revalidatePath("/[locale]/admin/calendar", "page");
  revalidatePath("/[locale]/schedule", "page");
  revalidatePath("/[locale]/admin/audit", "page");
}

/** Date and times are entered in the scheduler's saved time zone. */
export async function createCourseEventAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  // Administrators and assigned instructors; the RPC decides per course.
  const user = await getCurrentUser();
  if (!user) return { error: "denied" };
  const courseId = text(form, "course");
  const kind = text(form, "kind") as CourseEventKind;
  const lessonId = text(form, "lesson");
  const date = parseDayKey(text(form, "date"));
  const start = TIME_PATTERN.exec(text(form, "start"));
  const endText = text(form, "end");
  const end = endText ? TIME_PATTERN.exec(endText) : null;
  const url = text(form, "meeting_url");
  const titleEn = text(form, "title_en");
  const titleAr = text(form, "title_ar");
  if (
    !UUID_PATTERN.test(courseId) ||
    !COURSE_EVENT_KINDS.includes(kind) ||
    (lessonId && !UUID_PATTERN.test(lessonId)) ||
    !date ||
    !start ||
    (endText && !end) ||
    (!titleEn && !titleAr) ||
    (url && !/^https:\/\/\S+$/.test(url))
  )
    return { error: "invalid" };
  const timeZone = await getLearnerTimeZone(user.id);
  const startsAt = zonedTimeToUtc(
    date,
    Number(start[1]),
    Number(start[2]),
    timeZone,
  );
  let endsAt: Date | null = null;
  if (end && !isDueKind(kind)) {
    endsAt = zonedTimeToUtc(date, Number(end[1]), Number(end[2]), timeZone);
    // An end time earlier than the start means the session runs past midnight.
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 86_400_000);
  }
  const { error } = await (
    await createClient()
  ).rpc("admin_create_course_event", {
    p_course_id: courseId,
    p_kind: kind,
    p_lesson_id: lessonId || null,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt ? endsAt.toISOString() : null,
    p_meeting_url: url || null,
    p_title_en: titleEn || null,
    p_title_ar: titleAr || null,
    p_description_en: text(form, "description_en") || null,
    p_description_ar: text(form, "description_ar") || null,
  });
  if (error) return { error: errorKey(error) };
  refresh();
  return { success: "created" };
}

export async function cancelCourseEventAction(
  _state: AdminActionState,
  form: FormData,
): Promise<AdminActionState> {
  const id = text(form, "id");
  if (!UUID_PATTERN.test(id)) return { error: "invalid" };
  const { error } = await (
    await createClient()
  ).rpc("admin_cancel_course_event", { p_id: id });
  if (error) return { error: errorKey(error) };
  refresh();
  return { success: "cancelled" };
}
