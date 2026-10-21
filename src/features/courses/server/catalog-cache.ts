import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import type { Database } from "@/types/database";
import type { Locale } from "@/i18n/config";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  countCatalogCourses,
  getCatalogCourse,
  getCatalogCourseDurations,
  getCatalogCourseOutline,
  listCatalogCategories,
  listCatalogCourses,
  type CourseLevel,
} from "./course-repository";

// The public catalog reads only published rows, identically for anon and signed-in callers (RLS and
// the catalog RPCs never look at the caller), so one shared cache serves everyone. It uses a
// cookie-less anon client: nothing user-specific can enter the cache.
const CATALOG_TAG = "catalog";
// Edits through the admin content API clear the cache at once; this bounds staleness from anything else.
const CACHE = { tags: [CATALOG_TAG], revalidate: 300 };

function anonClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createSupabaseClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const cachedCatalogCourses = unstable_cache(
  (options: { locale: Locale; search?: string; category?: string; level?: CourseLevel; limit?: number; offset?: number }) =>
    listCatalogCourses(anonClient(), options),
  ["catalog-courses"],
  CACHE,
);

export const cachedCatalogCount = unstable_cache(
  (options: { locale: Locale; category?: string }) => countCatalogCourses(anonClient(), options),
  ["catalog-count"],
  CACHE,
);

export const cachedCatalogCategories = unstable_cache(
  (locale: Locale) => listCatalogCategories(anonClient(), locale),
  ["catalog-categories"],
  CACHE,
);

export const cachedCatalogDurations = unstable_cache(
  (locale: Locale, courseIds: string[]) => getCatalogCourseDurations(anonClient(), locale, courseIds),
  ["catalog-durations"],
  CACHE,
);

export const cachedCatalogCourse = unstable_cache(
  (locale: Locale, slug: string) => getCatalogCourse(anonClient(), locale, slug),
  ["catalog-course"],
  CACHE,
);

export const cachedCatalogOutline = unstable_cache(
  (locale: Locale, slug: string) => getCatalogCourseOutline(anonClient(), locale, slug),
  ["catalog-outline"],
  CACHE,
);

/** Admin edits: the next catalog request reads fresh data instead of a stale copy. */
export function expireCatalogCache() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/** Background changes (e.g. a video finished processing): serve stale while refreshing. */
export function refreshCatalogCache() {
  revalidateTag(CATALOG_TAG, "max");
}
