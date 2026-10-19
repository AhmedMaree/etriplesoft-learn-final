import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getCourseProgress(courseId: string, lessonIds: string[]) {
  const client = await createClient();
  const { data: enrollments, error } = await client
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId)
    .in("status", ["active", "completed"])
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("granted_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Progress is unavailable.");
  const enrollmentId = enrollments?.[0]?.id;
  if (!enrollmentId || lessonIds.length === 0) return [];
  const { data, error: progressError } = await client
    .from("lesson_progress")
    .select("lesson_id,status,percent,updated_at")
    .eq("enrollment_id", enrollmentId)
    .in("lesson_id", lessonIds)
    .order("updated_at", { ascending: false });
  if (progressError) throw new Error("Progress is unavailable.");
  // The caller supplies only exact-locale published lesson IDs from the course outline.
  return data ?? [];
}

/**
 * Lessons the caller may open now under the sequential-learning rule. Display only: every
 * lesson, video, quiz and resource RPC re-checks the same rule in the database.
 */
export async function getUnlockedLessons(courseId: string) {
  const client = await createClient();
  const { data, error } = await client.rpc("learner_unlocked_lessons", { p_course_id: courseId });
  if (error) throw new Error("Lesson access is unavailable.");
  return new Set((data ?? []).map((row) => row.lesson_id));
}
