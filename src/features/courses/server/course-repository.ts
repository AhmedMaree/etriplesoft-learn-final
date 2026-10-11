import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { Locale } from '@/i18n/config'
import type { Database } from '@/types/database'

// Typed access to the Phase 07 course domain. Every function takes the caller's Supabase client, so
// the database (RLS and the admin_* functions) stays the authority: public reads see only published,
// exact-locale rows, and admin writes succeed only for a user with a current admin role. No
// service-role client is involved and nothing here trusts a role passed in by the caller.

type Client = SupabaseClient<Database>

export const CATALOG_PAGE_SIZE = 24
export const COURSE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

export type CatalogCourse = {
  id: string
  slug: string
  title: string
  summary: string
  category: string | null
  level: string | null
  priceMinor: number
  currency: string
  thumbnailObjectKey: string | null
  publishedAt: string | null
  instructors: string[]
}

export type CatalogCourseDetail = CatalogCourse & { description: string | null }

export type AdminCourseSummary = {
  id: string
  slug: string
  status: string
  category: string | null
  level: string | null
  priceMinor: number
  currency: string
  publishedAt: string | null
  updatedAt: string
  localesPresent: string[]
  localesPublished: string[]
}

export type CourseRepositoryErrorCode = 'forbidden' | 'notFound' | 'slugTaken' | 'rule' | 'invalid' | 'unexpected'

export class CourseRepositoryError extends Error {
  constructor(readonly code: CourseRepositoryErrorCode, message: string) {
    super(message)
    this.name = 'CourseRepositoryError'
  }
}

function fail(error: PostgrestError): never {
  switch (error.code) {
    case '42501': throw new CourseRepositoryError('forbidden', 'Administrator access is required.')
    case 'P0002': throw new CourseRepositoryError('notFound', 'The course was not found.')
    case '23505': throw new CourseRepositoryError('slugTaken', 'That slug or attribution already exists.')
    // 23514: a lifecycle rule or constraint (published needs a translation, archived is read-only, price, slug format).
    case '23514': throw new CourseRepositoryError('rule', error.message)
    case '22023':
    case '23502':
    case '23503': throw new CourseRepositoryError('invalid', error.message)
    default: throw new CourseRepositoryError('unexpected', 'The course service could not complete the request.')
  }
}

function toCatalogCourse(row: Database['public']['Functions']['catalog_list_courses']['Returns'][number]): CatalogCourse {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    level: row.level,
    priceMinor: Number(row.price_minor),
    currency: row.currency,
    thumbnailObjectKey: row.thumbnail_object_key,
    publishedAt: row.published_at,
    instructors: row.instructors,
  }
}

// ---- Public catalog (anonymous-safe) ---------------------------------------------------------

export async function listCatalogCourses(
  client: Client,
  options: { locale: Locale; category?: string; level?: CourseLevel; limit?: number; offset?: number },
): Promise<{ courses: CatalogCourse[]; total: number }> {
  const { data, error } = await client.rpc('catalog_list_courses', {
    p_locale: options.locale,
    p_category: options.category,
    p_level: options.level,
    p_limit: options.limit ?? CATALOG_PAGE_SIZE,
    p_offset: options.offset ?? 0,
  })
  if (error) fail(error)
  const rows = data ?? []
  return { courses: rows.map(toCatalogCourse), total: Number(rows[0]?.total_count ?? 0) }
}

export async function getCatalogCourse(client: Client, locale: Locale, slug: string): Promise<CatalogCourseDetail | null> {
  if (!COURSE_SLUG_PATTERN.test(slug)) return null
  const { data, error } = await client.rpc('catalog_get_course', { p_slug: slug, p_locale: locale })
  if (error) fail(error)
  const row = data?.[0]
  if (!row) return null // unpublished, missing, or not published in this exact locale: never a fallback
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    category: row.category,
    level: row.level,
    priceMinor: Number(row.price_minor),
    currency: row.currency,
    thumbnailObjectKey: row.thumbnail_object_key,
    publishedAt: row.published_at,
    instructors: row.instructors,
  }
}

// ---- Admin operations (the database re-checks the current admin role on every call) -----------

export async function createCourse(
  client: Client,
  input: { slug: string; category?: string; level?: CourseLevel; priceMinor?: number; thumbnailObjectKey?: string },
): Promise<string> {
  const { data, error } = await client.rpc('admin_create_course', {
    p_slug: input.slug,
    p_category: input.category,
    p_level: input.level,
    p_price_minor: input.priceMinor ?? 0,
    p_thumbnail_object_key: input.thumbnailObjectKey,
  })
  if (error) fail(error)
  return data
}

export async function updateCourse(
  client: Client,
  courseId: string,
  input: { slug: string; category: string | null; level: CourseLevel | null; priceMinor: number; thumbnailObjectKey?: string | null },
): Promise<void> {
  const { error } = await client.rpc('admin_update_course', {
    p_course_id: courseId,
    p_slug: input.slug,
    p_category: input.category as string,
    p_level: input.level as string,
    p_price_minor: input.priceMinor,
    p_thumbnail_object_key: input.thumbnailObjectKey ?? undefined,
  })
  if (error) fail(error)
}

export async function setCourseStatus(client: Client, courseId: string, status: CourseStatus): Promise<void> {
  const { error } = await client.rpc('admin_set_course_status', { p_course_id: courseId, p_status: status })
  if (error) fail(error)
}

export async function saveCourseTranslation(
  client: Client,
  courseId: string,
  locale: Locale,
  input: { title: string; summary: string; description?: string },
): Promise<void> {
  const { error } = await client.rpc('admin_upsert_course_translation', {
    p_course_id: courseId,
    p_locale: locale,
    p_title: input.title,
    p_summary: input.summary,
    p_description: input.description,
  })
  if (error) fail(error)
}

export async function setTranslationPublication(client: Client, courseId: string, locale: Locale, published: boolean): Promise<void> {
  const { error } = await client.rpc('admin_set_translation_publication', { p_course_id: courseId, p_locale: locale, p_published: published })
  if (error) fail(error)
}

export async function setCourseInstructors(
  client: Client,
  courseId: string,
  instructors: { displayName: string; profileId?: string }[],
): Promise<void> {
  const { error } = await client.rpc('admin_set_course_instructors', {
    p_course_id: courseId,
    p_instructors: instructors.map((i) => ({ display_name: i.displayName, ...(i.profileId ? { profile_id: i.profileId } : {}) })),
  })
  if (error) fail(error)
}

export async function listAdminCourses(
  client: Client,
  options: { status?: CourseStatus; limit?: number; offset?: number } = {},
): Promise<{ courses: AdminCourseSummary[]; total: number }> {
  const { data, error } = await client.rpc('admin_list_courses', {
    p_status: options.status,
    p_limit: options.limit ?? 50,
    p_offset: options.offset ?? 0,
  })
  if (error) fail(error)
  const rows = data ?? []
  return {
    courses: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: row.status,
      category: row.category,
      level: row.level,
      priceMinor: Number(row.price_minor),
      currency: row.currency,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      localesPresent: row.locales_present,
      localesPublished: row.locales_published,
    })),
    total: Number(rows[0]?.total_count ?? 0),
  }
}

export async function getAdminCourse(client: Client, courseId: string): Promise<Database['public']['Functions']['admin_get_course']['Returns']> {
  const { data, error } = await client.rpc('admin_get_course', { p_course_id: courseId })
  if (error) fail(error)
  return data
}
