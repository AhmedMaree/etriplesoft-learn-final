import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  let input: unknown;
  try {
    input = await readBoundedJson(request);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (
    !input ||
    typeof input !== "object" ||
    !("courseId" in input) ||
    typeof input.courseId !== "string" ||
    !("locale" in input) ||
    typeof input.locale !== "string" ||
    !isLocale(input.locale)
  )
    return reply({ error: "invalid" }, 400);
  const client = await createClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return reply({ error: "authentication" }, 401);
  if ("lessonId" in input) {
    if (typeof input.lessonId !== "string")
      return reply({ error: "invalid" }, 400);
    // Prevent mismatched course/lesson input before making either mutation.
    const { data: lesson, error } = await client.rpc("learner_get_lesson", {
      p_lesson_id: input.lessonId,
      p_locale: input.locale,
    });
    if (error || lesson?.[0]?.course_id !== input.courseId)
      return reply({ error: "access" }, 403);
    const reading = await client.rpc("learner_complete_reading", {
      p_lesson_id: input.lessonId,
      p_locale: input.locale,
    });
    if (reading.error)
      return reply(
        { error: "notReady" },
        reading.error.code === "42501" ? 403 : 409,
      );
  }
  const { data, error } = await client.rpc("learner_evaluate_completion", {
    p_course_id: input.courseId,
    p_locale: input.locale,
  });
  return error
    ? reply({ error: "failed" }, error.code === "42501" ? 403 : 503)
    : reply({ completion: data });
}
