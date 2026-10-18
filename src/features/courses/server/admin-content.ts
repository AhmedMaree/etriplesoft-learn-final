import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/i18n/config";
export type AdminResource = { id: string; label: string; published: boolean };
export type AdminLesson = {
  id: string;
  position: number;
  type: string;
  status: string;
  required: boolean;
  preview: boolean;
  duration: number | null;
  title: string;
  summary: string;
  body: string;
  published: boolean;
  resources: AdminResource[];
};
export type AdminModule = {
  id: string;
  position: number;
  required: boolean;
  title: string;
  description: string;
  published: boolean;
  lessons: AdminLesson[];
};
export type EditableCourse = {
  id: string;
  slug: string;
  status: string;
  category: string;
  level: string;
  price: number;
  title: string;
  summary: string;
  description: string;
  published: boolean;
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) => (typeof value === "string" ? value : "");
function resource(value: unknown): value is AdminResource {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    typeof value.published === "boolean"
  );
}
function lesson(value: unknown): value is AdminLesson {
  return (
    record(value) &&
    ["id", "type", "status", "title", "summary", "body"].every(
      (key) => typeof value[key] === "string",
    ) &&
    ["required", "preview", "published"].every(
      (key) => typeof value[key] === "boolean",
    ) &&
    typeof value.position === "number" &&
    (value.duration === null || typeof value.duration === "number") &&
    Array.isArray(value.resources) &&
    value.resources.every(resource)
  );
}
function moduleRow(value: unknown): value is AdminModule {
  return (
    record(value) &&
    typeof value.id === "string" &&
    typeof value.position === "number" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.required === "boolean" &&
    typeof value.published === "boolean" &&
    Array.isArray(value.lessons) &&
    value.lessons.every(lesson)
  );
}
export async function getEditableCourse(id: string, locale: Locale) {
  const client = await createClient();
  const [course, curriculum] = await Promise.all([
    client.rpc("admin_get_course", { p_course_id: id }),
    client.rpc("admin_get_curriculum", { p_course_id: id, p_locale: locale }),
  ]);
  if (
    course.error ||
    curriculum.error ||
    !record(course.data) ||
    !Array.isArray(curriculum.data) ||
    !curriculum.data.every(moduleRow)
  )
    throw new Error("Course administration unavailable.");
  const value = course.data;
  const translated = Array.isArray(value.translations)
    ? value.translations.find((item) => record(item) && item.locale === locale)
    : null;
  const translation = record(translated) ? translated : {};
  const editable: EditableCourse = {
    id,
    slug: text(value.slug),
    status: text(value.status),
    category: text(value.category),
    level: text(value.level),
    price: typeof value.price_minor === "number" ? value.price_minor : 0,
    title: text(translation.title),
    summary: text(translation.summary),
    description: text(translation.description),
    published: translation.publication_status === "published",
  };
  return { course: editable, modules: curriculum.data };
}
