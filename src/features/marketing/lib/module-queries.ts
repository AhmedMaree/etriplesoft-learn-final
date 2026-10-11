import type { Course } from "../model/course";
import { odooModules, type OdooModule } from "../data/odoo-modules";
import { getCourseBySlug } from "../server/course-repository";

export function getAllModules(): OdooModule[] {
  return odooModules;
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

export function getCoursesForModule(moduleSlug: string | undefined | null): Course[] {
  const mod = getModuleBySlug(moduleSlug);
  if (!mod) return [];
  const seen = new Set<string>();
  const result: Course[] = [];
  for (const slug of mod.relatedCourseSlugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    const course = getCourseBySlug(slug);
    if (course) result.push(course);
  }
  return result;
}

export function getModulesForCourse(course: Course): OdooModule[] {
  return getModulesBySlugs(course.coveredModuleSlugs);
}
