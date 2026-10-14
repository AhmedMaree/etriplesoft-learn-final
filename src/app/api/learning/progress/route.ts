import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getMuxAllowedOrigins } from "@/lib/mux/server";
import { createClient } from "@/lib/supabase/server";
import { readBoundedJson } from "@/lib/http/bounded-json";

export const dynamic = "force-dynamic";
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    if (!getMuxAllowedOrigins().includes(request.headers.get("origin") ?? ""))
      return reply({ error: "origin" }, 403);
  } catch {
    return reply({ error: "configuration" }, 503);
  }
  if (Number(request.headers.get("content-length")) > 2048)
    return reply({ error: "body" }, 413);
  let value: unknown;
  try {
    value = await readBoundedJson(request);
  } catch {
    return reply({ error: "body" }, 400);
  }
  if (
    !value ||
    typeof value !== "object" ||
    !("locale" in value) ||
    typeof value.locale !== "string" ||
    !isLocale(value.locale)
  ) {
    return reply({ error: "input" }, 400);
  }
  const client = await createClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return reply({ error: "authentication" }, 401);
  if (
    "lessonId" in value &&
    typeof value.lessonId === "string" &&
    uuid.test(value.lessonId)
  ) {
    const { data, error } = await client.rpc("learner_start_video_session", {
      p_lesson_id: value.lessonId,
      p_locale: value.locale,
    });
    return error
      ? reply({ error: "access" }, error.code === "42501" ? 403 : 503)
      : reply(data?.[0] ?? {});
  }
  if (
    !("sessionId" in value) ||
    typeof value.sessionId !== "string" ||
    !uuid.test(value.sessionId) ||
    !("sequence" in value) ||
    typeof value.sequence !== "number" ||
    !Number.isSafeInteger(value.sequence) ||
    value.sequence <= 0 ||
    value.sequence > 2147483647 ||
    !("position" in value) ||
    typeof value.position !== "number" ||
    !Number.isFinite(value.position) ||
    value.position < 0 ||
    !("playing" in value) ||
    typeof value.playing !== "boolean"
  )
    return reply({ error: "input" }, 400);
  const { data, error } = await client.rpc("learner_checkpoint_video", {
    p_session_id: value.sessionId,
    p_locale: value.locale,
    p_sequence: value.sequence,
    p_position: value.position,
    p_playing: value.playing,
  });
  return error
    ? reply(
        { error: "checkpoint" },
        error.code === "42501" ? 403 : error.code === "22023" ? 400 : 503,
      )
    : reply(data?.[0] ?? {});
}
