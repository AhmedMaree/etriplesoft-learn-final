import "server-only";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { COURSE_EVENT_KINDS, type CourseEventKind } from "../types";
import type { AdminCourseEvent } from "../components/admin-events";

export type SchedulableCourses = {
  courses: { id: string; slug: string; title: string | null }[];
  lessons: { id: string; courseSlug: string; title: string }[];
};

/**
 * Courses the caller may schedule for: every published course for an MFA-verified administrator,
 * only assigned courses for an instructor, none for anyone else. The database decides.
 */
export async function listSchedulableCourses(
  locale: Locale,
): Promise<SchedulableCourses> {
  const { data, error } = await (
    await createClient()
  ).rpc("staff_list_schedulable_courses", { p_locale: locale });
  if (error || !data) return { courses: [], lessons: [] };
  return {
    courses: data.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title ?? null,
    })),
    lessons: data.flatMap((row) =>
      (Array.isArray(row.lessons) ? row.lessons : []).flatMap((lesson) =>
        lesson &&
        typeof lesson === "object" &&
        !Array.isArray(lesson) &&
        typeof lesson.id === "string"
          ? [
              {
                id: lesson.id,
                courseSlug: row.slug,
                title: typeof lesson.title === "string" ? lesson.title : "",
              },
            ]
          : [],
      ),
    ),
  };
}

/** Events the caller may manage (all for administrators, assigned courses for instructors). */
export async function listManagedCourseEvents(
  locale: Locale,
): Promise<AdminCourseEvent[] | null> {
  const { data, error } = await (
    await createClient()
  ).rpc("admin_list_course_events", { p_locale: locale });
  if (error) return null;
  return (data ?? [])
    .filter((row) =>
      (COURSE_EVENT_KINDS as readonly string[]).includes(row.kind),
    )
    .map((row) => ({
      id: row.id,
      courseSlug: row.course_slug,
      courseTitle: row.course_title,
      kind: row.kind as CourseEventKind,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      meetingUrl: row.meeting_url,
      status: row.status === "cancelled" ? "cancelled" : "scheduled",
      titleEn: row.title_en,
      titleAr: row.title_ar,
      learnerCount: row.learner_count,
    }));
}
