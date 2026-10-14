import "server-only";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
type LearningCourse = {
  slug: string;
  title: string;
  status: string;
  required: number;
  finished: number;
  resumeLessonId: string | null;
};
export type LearningSummary = {
  enrolledCourses: number;
  completedCourses: number;
  passedAssessments: number;
  certificates: number;
  courses: LearningCourse[];
};
function isSummary(value: unknown): value is LearningSummary {
  if (
    !value ||
    typeof value !== "object" ||
    !("courses" in value) ||
    !Array.isArray(value.courses)
  )
    return false;
  for (const key of [
    "enrolledCourses",
    "completedCourses",
    "passedAssessments",
    "certificates",
  ])
    if (!(key in value) || typeof Reflect.get(value, key) !== "number")
      return false;
  return value.courses.every(
    (c) =>
      c &&
      typeof c === "object" &&
      typeof c.slug === "string" &&
      typeof c.title === "string" &&
      typeof c.status === "string" &&
      typeof c.required === "number" &&
      typeof c.finished === "number" &&
      (c.resumeLessonId === null || typeof c.resumeLessonId === "string"),
  );
}
export async function getLearningSummary(locale: Locale) {
  const { data, error } = await (
    await createClient()
  ).rpc("learner_learning_summary", { p_locale: locale });
  if (error || !isSummary(data))
    throw new Error("Learning summary unavailable.");
  return data;
}
