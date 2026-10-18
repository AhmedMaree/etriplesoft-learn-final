import type { Course } from "../model/course";
import { odooModules, type OdooModule } from "../data/odoo-modules";
import { getCourseBySlug } from "../server/course-repository";
import { getMarketingMessages } from "./messages";
import type { Locale } from "@/i18n/config";

export function getAllModules(locale: Locale): OdooModule[] {
  const localized = getMarketingMessages(locale).modules.content;
  return odooModules.map((module) => ({
    ...module,
    ...localized[module.slug as keyof typeof localized],
  }));
}

export function getModuleBySlug(slug: string | undefined | null): OdooModule | undefined {
  if (!slug) return undefined;
  return odooModules.find((mod) => mod.slug === slug);
}

export function getModulesBySlugs(slugs: readonly string[]): OdooModule[] {
  const seen = new Set<string>();
  const result: OdooModule[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const mod = getModuleBySlug(slug);
    if (mod) result.push(mod);
  }
  return result;
}

export function getCoursesForModule(moduleSlug: string | undefined | null, locale: Locale = "en"): Course[] {
  const mod = getModuleBySlug(moduleSlug);
  if (!mod) return [];
  const seen = new Set<string>();
  const result: Course[] = [];
  for (const slug of mod.relatedCourseSlugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const course = getCourseBySlug(slug, locale);
    if (course) result.push(course);
  }
  return result;
}

export function getModulesForCourse(course: Course, locale: Locale = "en"): OdooModule[] {
  const localized = getAllModules(locale);
  return getModulesBySlugs(course.coveredModuleSlugs)
    .map((mod) => localized.find((item) => item.slug === mod.slug) ?? mod);
}
