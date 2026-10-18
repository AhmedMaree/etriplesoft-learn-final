import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { isLocale } from "@/i18n/config";
import { COURSE_SLUG_PATTERN } from "@/features/courses/server/course-repository";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const str = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return reply({ error: "origin" }, 403);
  if ((await getAdminAccess()).status !== "admin")
    return reply({ error: "access" }, 403);
  let input: unknown;
  try {
    input = await readBoundedJson(request, 450000);
  } catch {
    return reply({ error: "invalid" }, 400);
  }
  if (
    !object(input) ||
    typeof input.locale !== "string" ||
    !isLocale(input.locale)
  )
    return reply({ error: "invalid" }, 400);
  const client = await createClient();
  const id =
    typeof input.id === "string" && uuid.test(input.id) ? input.id : undefined;
  const errorReply = (code: string) =>
    reply(
      { error: code === "42501" ? "access" : "rule" },
      code === "42501" ? 403 : 409,
    );
  if (input.action === "course") {
    if (
      !str(input.slug, 100) ||
      !COURSE_SLUG_PATTERN.test(input.slug) ||
      !str(input.title, 160) ||
      !str(input.summary, 1000) ||
      !str(input.description, 20000) ||
      !str(input.category, 80) ||
      !str(input.level, 20) ||
      typeof input.price !== "number" ||
      !Number.isSafeInteger(input.price) ||
      input.price < 0 ||
      input.price > 999999999 ||
      typeof input.published !== "boolean" ||
      (input.id !== undefined && !id)
    )
      return reply({ error: "invalid" }, 400);
    const { data, error } = await client.rpc("admin_save_course_content", {
      ...(id ? { p_id: id } : {}),
      p_slug: input.slug,
      p_locale: input.locale,
      p_title: input.title,
      p_summary: input.summary,
      p_description: input.description,
      p_category: input.category,
      p_level: input.level,
      p_price_minor: input.price,
      p_publish: input.published,
    });
    return error ? errorReply(error.code) : reply({ id: data });
  }
  if (input.action === "createModule" && id && str(input.title, 160)) {
    const { data, error } = await client.rpc("admin_create_module_draft", {
      p_course_id: id,
      p_locale: input.locale,
      p_title: input.title,
    });
    return error ? errorReply(error.code) : reply({ id: data });
  }
  if (
    input.action === "createLesson" &&
    id &&
    str(input.title, 200) &&
    typeof input.type === "string" &&
    ["video", "article", "resource", "assessment"].includes(input.type)
  ) {
    const { data, error } = await client.rpc("admin_create_lesson_draft", {
      p_module_id: id,
      p_locale: input.locale,
      p_title: input.title,
      p_type: input.type,
    });
    return error ? errorReply(error.code) : reply({ id: data });
  }
  if (
    input.action === "module" &&
    id &&
    str(input.title, 160) &&
    str(input.description, 2000) &&
    typeof input.required === "boolean" &&
    typeof input.published === "boolean"
  ) {
    const { error } = await client.rpc("admin_edit_module", {
      p_id: id,
      p_locale: input.locale,
      p_title: input.title,
      p_description: input.description,
      p_required: input.required,
      p_publish: input.published,
    });
    return error ? errorReply(error.code) : reply({ saved: true });
  }
  if (
    input.action === "lesson" &&
    id &&
    str(input.title, 200) &&
    str(input.summary, 1000) &&
    str(input.body, 100000) &&
    typeof input.required === "boolean" &&
    typeof input.preview === "boolean" &&
    typeof input.published === "boolean" &&
    (input.duration === null ||
      (typeof input.duration === "number" &&
        Number.isSafeInteger(input.duration) &&
        input.duration > 0 &&
        input.duration <= 2147483647))
  ) {
    const { error } = await client.rpc("admin_edit_lesson", {
      p_id: id,
      p_locale: input.locale,
      p_title: input.title,
      p_summary: input.summary,
      p_body: input.body,
      p_required: input.required,
      p_preview: input.preview,
      p_publish: input.published,
      ...(typeof input.duration === "number"
        ? { p_duration: input.duration }
        : {}),
    });
    return error ? errorReply(error.code) : reply({ saved: true });
  }
  if (
    input.action === "reorder" &&
    id &&
    Array.isArray(input.ids) &&
    input.ids.length <= 200 &&
    input.ids.every(
      (value: unknown) => typeof value === "string" && uuid.test(value),
    ) &&
    new Set(input.ids).size === input.ids.length
  ) {
    const { error } = await client.rpc("admin_reorder_module_lessons", {
      p_module_id: id,
      p_lesson_ids: input.ids,
    });
    return error ? errorReply(error.code) : reply({ saved: true });
  }
  return reply({ error: "invalid" }, 400);
}
