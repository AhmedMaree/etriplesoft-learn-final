import { notFound } from "next/navigation";
import { createPageMetadata } from "@/i18n/page-metadata";
import { Panel } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess, getCurrentUser } from "@/lib/supabase/auth";
import { isLocale, type Locale } from "@/i18n/config";
import {
  CATALOG_PAGE_SIZE,
  COURSE_SLUG_PATTERN,
  getCourseEnrollment,
  listMyEnrollments,
  type CatalogCourse,
  type CourseLevel,
  type CourseEnrollment,
} from "@/features/courses/server/course-repository";
import {
  cachedCatalogCategories,
  cachedCatalogCount,
  cachedCatalogCourse,
  cachedCatalogCourses,
  cachedCatalogDurations,
  cachedCatalogOutline,
} from "@/features/courses/server/catalog-cache";
import { LearnerCourses, type CourseFilter } from "@/features/courses/components/learner-courses";
import { LearnerCourseDetail, LearnerCourseUnavailable } from "@/features/courses/components/learner-course-detail";
import { getMarketingMessages } from "@/features/marketing/lib/messages";

type SearchParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const MINE_LIMIT = 100;

function pageNumber(value: string | undefined) {
  return value && /^\d+$/.test(value) ? Math.min(Math.max(Number(value), 1), 100_000) : 1;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "courses", "/courses");
}

export default async function CoursesRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale: requestedLocale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(requestedLocale)) notFound();
  const locale: Locale = requestedLocale;
  const copy = getMarketingMessages(locale).catalog;
  // The verified session answers "signed in" locally; the admin check (an Auth server round trip
  // plus a role read) only decides the preview badge, so it runs alongside the catalog reads.
  const [client, user] = await Promise.all([createClient(), getCurrentUser()]);
  const signedIn = Boolean(user);
  const adminPreviewPromise = signedIn ? getAdminAccess().then((access) => access.status === "admin") : Promise.resolve(false);

  // The detail opens on this same route (?course=<slug>); nothing redirects to another page.
  const courseSlug = first(query.course);
  if (courseSlug && COURSE_SLUG_PATTERN.test(courseSlug)) {
    const [detail, adminPreview] = await Promise.all([loadDetail(client, locale, courseSlug, signedIn), adminPreviewPromise]);
    if (!detail) return <Panel><p role="alert">{copy.searchError}</p></Panel>;
    if (detail.kind === "unavailable") {
      return <LearnerCourseUnavailable locale={locale} slug={courseSlug} availableLocale={detail.availableLocale} />;
    }
    return (
      <LearnerCourseDetail
        course={detail.course}
        outline={detail.outline}
        locale={locale}
        enrollment={detail.enrollment}
        enrollmentError={first(query.enrollment) === "unavailable"}
        signedIn={signedIn}
        adminPreview={adminPreview}
      />
    );
  }

  const search = (first(query.q) ?? "").trim().slice(0, 100);
  const requestedView = first(query.view);
  const view: CourseFilter["view"] = requestedView === "newest" || (requestedView === "mine" && signedIn) ? requestedView : "all";
  const requestedLevel = first(query.level);
  const level: CourseLevel | null = requestedLevel === "beginner" || requestedLevel === "intermediate" || requestedLevel === "advanced" ? requestedLevel : null;
  const sort = first(query.sort) === "newest" ? "newest" : "relevant";
  const instructor = (first(query.instructor) ?? "").trim().slice(0, 100) || null;
  const [list, adminPreview] = await Promise.all([loadList(client, {
    locale,
    search,
    view,
    requestedCategory: (first(query.category) ?? "").trim(),
    level,
    instructor,
    requestedPage: pageNumber(first(query.page)),
    signedIn,
  }), adminPreviewPromise]);

  return (
    <>
      {list ? (
        <LearnerCourses
          locale={locale}
          courses={list.courses}
          enrollments={list.enrollments}
          categories={list.categories}
          total={list.total}
          catalogTotal={list.catalogTotal}
          filter={{ view, category: list.category, level, instructor, query: search, sort }}
          page={list.page}
          pages={Math.max(1, Math.ceil(list.total / CATALOG_PAGE_SIZE))}
          signedIn={signedIn}
          adminPreview={adminPreview}
          stats={list.stats}
        />
      ) : (
        <Panel><p role="alert">{copy.searchError}</p></Panel>
      )}
    </>
  );
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function loadDetail(client: Client, locale: Locale, slug: string, signedIn: boolean) {
  try {
    // Both are keyed by slug, so they load together; only the enrollment needs the course id.
    const [course, outline] = await Promise.all([cachedCatalogCourse(locale, slug), cachedCatalogOutline(locale, slug)]);
    if (course) {
      const enrollment = signedIn ? await getCourseEnrollment(client, course.id) : null;
      return { kind: "course" as const, course, outline, enrollment };
    }
    const otherLocale: Locale = locale === "en" ? "ar" : "en";
    const translated = await cachedCatalogCourse(otherLocale, slug);
    return { kind: "unavailable" as const, availableLocale: translated ? otherLocale : null };
  } catch {
    return null;
  }
}

async function loadList(
  client: Client,
  options: { locale: Locale; search: string; view: CourseFilter["view"]; requestedCategory: string; level: CourseLevel | null; instructor: string | null; requestedPage: number; signedIn: boolean },
) {
  const { locale, view, requestedCategory, signedIn } = options;
  try {
    const [categoryNames, enrollments, catalogTotal] = await Promise.all([
      cachedCatalogCategories(locale),
      signedIn ? listMyEnrollments(client) : Promise.resolve<Record<string, CourseEnrollment>>({}),
      cachedCatalogCount({ locale }),
    ]);
    const category = view === "all" && categoryNames.includes(requestedCategory) ? requestedCategory : null;
    // Durations follow the page they describe, while the category counts load alongside.
    const [categories, { courses, total, page, durations }] = await Promise.all([
      Promise.all(categoryNames.map(async (name) => ({ name, count: await cachedCatalogCount({ locale, category: name }) }))),
      loadPage({ ...options, category, enrollments }).then(async (result) => ({
        ...result,
        durations: await cachedCatalogDurations(
          locale,
          result.courses.map((course) => course.id),
        ),
      })),
    ]);

    const entitled = Object.values(enrollments).filter((item) => item.status === "active" || item.status === "completed");
    return {
      courses: courses.map((course) => ({
        ...course,
        durationSeconds: durations[course.id] ?? null,
      })),
      total,
      catalogTotal,
      page,
      category,
      categories,
      enrollments,
      stats: { enrolled: entitled.length, completed: entitled.filter((item) => item.status === "completed").length },
    };
  } catch {
    return null;
  }
}

async function loadPage(
  options: { locale: Locale; search: string; view: CourseFilter["view"]; category: string | null; level: CourseLevel | null; instructor: string | null; requestedPage: number; enrollments: Record<string, CourseEnrollment> },
) {
  const { locale, search, view, category, level, instructor, enrollments } = options;
  let page = options.requestedPage;
  let courses: CatalogCourse[] = [];
  let total = 0;
  if (view === "all") {
    if (instructor) {
      const result = await cachedCatalogCourses({ locale, search, category: category ?? undefined, level: level ?? undefined, limit: 50 });
      const matches = result.courses.filter((course) => course.instructors.some((name) => name === instructor));
      total = matches.length;
      const lastPage = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
      page = Math.min(page, lastPage);
      courses = matches.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
    } else {
      const load = (offset: number) => cachedCatalogCourses({ locale, search, category: category ?? undefined, level: level ?? undefined, limit: CATALOG_PAGE_SIZE, offset });
      let result = await load((page - 1) * CATALOG_PAGE_SIZE);
      const lastPage = Math.max(1, Math.ceil(result.total / CATALOG_PAGE_SIZE));
      if (page > lastPage) {
        page = lastPage;
        result = await load((page - 1) * CATALOG_PAGE_SIZE);
      }
      courses = result.courses;
      total = result.total;
    }
  } else {
    // "Mine" and "Newest" work on a bounded set so the ordering/filter is exact for this page size.
    const { courses: pool } = await cachedCatalogCourses({ locale, search, category: category ?? undefined, level: level ?? undefined, limit: MINE_LIMIT });
    let list = view === "mine" ? pool.filter((course) => enrollments[course.id]) : [...pool];
    if (instructor) list = list.filter((course) => course.instructors.some((name) => name === instructor));
    if (view === "newest") list.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
    page = Math.min(page, lastPage);
    courses = list.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  }
  return { courses, total, page };
}
