import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { isQuizState } from "@/features/assessments/types";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  // Same-origin cookie mutation; direct RPC callers are still checked independently in PostgreSQL.
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  let input: unknown;
  try {
    input = await readBoundedJson(request, 100000);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (
    !input ||
    typeof input !== "object" ||
    !("lessonId" in input) ||
    typeof input.lessonId !== "string" ||
    !uuid.test(input.lessonId) ||
    !("locale" in input) ||
    typeof input.locale !== "string" ||
    !isLocale(input.locale) ||
    !("action" in input) ||
    typeof input.action !== "string" ||
    !["get", "start", "save", "submit"].includes(input.action)
  )
    return reply({ error: "invalid" }, 400);
  const client = await createClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return reply({ error: "authentication" }, 401);
  const params: {
    p_lesson_id: string;
    p_locale: string;
    p_action: string;
    p_attempt_id?: string;
    p_sequence?: number;
    p_answers?: Json;
  } = {
    p_lesson_id: input.lessonId,
    p_locale: input.locale,
    p_action: input.action,
  };
  if ("attemptId" in input) {
    if (typeof input.attemptId !== "string" || !uuid.test(input.attemptId))
      return reply({ error: "invalid" }, 400);
    params.p_attempt_id = input.attemptId;
  }
  if (["save", "submit"].includes(input.action)) {
    if (
      !params.p_attempt_id ||
      !("sequence" in input) ||
      typeof input.sequence !== "number" ||
      !Number.isSafeInteger(input.sequence) ||
      input.sequence < 1 ||
      input.sequence > 2147483647 ||
      !("answers" in input) ||
      !input.answers ||
      typeof input.answers !== "object" ||
      Array.isArray(input.answers)
    )
      return reply({ error: "invalid" }, 400);
    const answers: Record<string, string[]> = {};
    const entries = Object.entries(input.answers);
    if (entries.length > 100) return reply({ error: "invalid" }, 400);
    for (const [key, value] of entries) {
      if (
        !uuid.test(key) ||
        !Array.isArray(value) ||
        value.length > 10 ||
        !value.every(
          (option: unknown) => typeof option === "string" && uuid.test(option),
        )
      )
        return reply({ error: "invalid" }, 400);
      answers[key] = value;
    }
    params.p_sequence = input.sequence;
    params.p_answers = answers;
  }
  const { data, error } = await client.rpc("learner_quiz_action", params);
  if (error)
    return reply(
      {
        error:
          error.code === "23514"
            ? "rule"
            : error.code === "42501"
              ? "access"
              : "failed",
      },
      error.code === "42501"
        ? 403
        : error.code === "23514" || error.code === "22023"
          ? 409
          : 503,
    );
  if (data === null) return reply({ quiz: null });
  if (!isQuizState(data)) return reply({ error: "failed" }, 503);
  return reply({ quiz: data });
}
