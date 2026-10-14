import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { isLocale } from "@/i18n/config";
import { readBoundedJson } from "@/lib/http/bounded-json";
import type { Json } from "@/types/database";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";

const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  if ((await getAdminAccess()).status !== "admin")
    return reply({ error: "access" }, 403);
  let input: unknown;
  try {
    input = await readBoundedJson(request, 500000);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (!input || typeof input !== "object" || !("action" in input))
    return reply({ error: "invalid" }, 400);
  const client = await createClient();
  if (
    input.action === "localize" &&
    "versionId" in input &&
    typeof input.versionId === "string" &&
    "locale" in input &&
    typeof input.locale === "string" &&
    isLocale(input.locale) &&
    "title" in input &&
    typeof input.title === "string" &&
    input.title.length <= 200 &&
    "instructions" in input &&
    typeof input.instructions === "string" &&
    input.instructions.length <= 2000 &&
    "questions" in input &&
    Array.isArray(input.questions) &&
    input.questions.length <= 100
  ) {
    const translated: Json[] = [];
    for (const q of input.questions) {
      if (
        !q ||
        typeof q !== "object" ||
        !("prompt" in q) ||
        typeof q.prompt !== "string" ||
        q.prompt.length > 4000 ||
        !("explanation" in q) ||
        typeof q.explanation !== "string" ||
        q.explanation.length > 4000 ||
        !("options" in q) ||
        !Array.isArray(q.options) ||
        q.options.length > 10 ||
        !q.options.every(
          (o: unknown) => typeof o === "string" && o.length <= 1000,
        )
      )
        return reply({ error: "invalid" }, 400);
      translated.push({
        prompt: q.prompt,
        explanation: q.explanation,
        options: q.options,
      });
    }
    const { error } = await client.rpc("admin_localize_quiz_draft", {
      p_version_id: input.versionId,
      p_locale: input.locale,
      p_title: input.title,
      p_instructions: input.instructions,
      p_questions: translated,
    });
    return error
      ? reply({ error: "invalid" }, 409)
      : reply({ localized: true });
  }
  if (
    input.action === "publish" &&
    "versionId" in input &&
    typeof input.versionId === "string"
  ) {
    const { error } = await client.rpc("admin_publish_quiz_version", {
      p_version_id: input.versionId,
    });
    return error
      ? reply({ error: "invalid" }, 409)
      : reply({ published: true });
  }
  if (
    input.action !== "draft" ||
    !("lessonId" in input) ||
    typeof input.lessonId !== "string" ||
    !("locale" in input) ||
    typeof input.locale !== "string" ||
    !isLocale(input.locale) ||
    !("title" in input) ||
    typeof input.title !== "string" ||
    input.title.length > 200 ||
    !("instructions" in input) ||
    typeof input.instructions !== "string" ||
    input.instructions.length > 2000 ||
    !("questions" in input) ||
    !Array.isArray(input.questions) ||
    input.questions.length < 1 ||
    input.questions.length > 100
  )
    return reply({ error: "invalid" }, 400);
  const questions: Json[] = [];
  for (const question of input.questions) {
    if (
      !question ||
      typeof question !== "object" ||
      !("type" in question) ||
      typeof question.type !== "string" ||
      !["single", "multiple", "true_false"].includes(question.type) ||
      !("prompt" in question) ||
      typeof question.prompt !== "string" ||
      question.prompt.length > 4000 ||
      !("explanation" in question) ||
      typeof question.explanation !== "string" ||
      question.explanation.length > 4000 ||
      !("options" in question) ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.length > 10
    )
      return reply({ error: "invalid" }, 400);
    const options: Json[] = [];
    for (const option of question.options) {
      if (
        !option ||
        typeof option !== "object" ||
        !("label" in option) ||
        typeof option.label !== "string" ||
        option.label.length > 1000 ||
        !("correct" in option) ||
        typeof option.correct !== "boolean"
      )
        return reply({ error: "invalid" }, 400);
      options.push({ label: option.label, correct: option.correct });
    }
    questions.push({
      type: question.type,
      prompt: question.prompt,
      explanation: question.explanation,
      options,
    });
  }
  const { data, error } = await client.rpc("admin_create_quiz_version", {
    p_lesson_id: input.lessonId,
    p_locale: input.locale,
    p_title: input.title,
    p_instructions: input.instructions,
    p_questions: questions,
  });
  return error ? reply({ error: "invalid" }, 409) : reply({ versionId: data });
}
