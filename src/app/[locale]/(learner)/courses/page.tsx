import { notFound } from "next/navigation";
import { createPageMetadata } from "@/i18n/page-metadata";
import { Panel } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { isLocale, type Locale } from "@/i18n/config";
import {
  CATALOG_PAGE_SIZE,
  COURSE_SLUG_PATTERN,
  countCatalogCourses,
  getCatalogCourse,
  getCatalogCourseDurations,
  getCatalogCourseOutline,
  getCourseEnrollment,
  listCatalogCategories,
  listCatalogCourses,
  listMyEnrollments,
  type CatalogCourse,
  type CourseLevel,
  type CourseEnrollment,
} from "@/features/courses/server/course-repository";
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
  const client = await createClient();
  // getAdminAccess already resolves the user, so it answers "signed in" too without a second auth call.
  const access = await getAdminAccess();
  const signedIn = access.status !== "anonymous";
  const adminPreview = access.status === "admin";

  // The detail opens on this same route (?course=<slug>); nothing redirects to another page.
  const courseSlug = first(query.course);
  if (courseSlug && COURSE_SLUG_PATTERN.test(courseSlug)) {
    const detail = await loadDetail(client, locale, courseSlug, signedIn);
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
  const list = await loadList(client, {
    locale,
    search,
    view,
    requestedCategory: (first(query.category) ?? "").trim(),
    level,
    instructor,
    requestedPage: pageNumber(first(query.page)),
    signedIn,
  });

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
    const course = await getCatalogCourse(client, locale, slug);
    if (course) {
      const [outline, enrollment] = await Promise.all([
        getCatalogCourseOutline(client, locale, slug),
        signedIn ? getCourseEnrollment(client, course.id) : Promise.resolve(null),
      ]);
      return { kind: "course" as const, course, outline, enrollment };
    }
    const otherLocale: Locale = locale === "en" ? "ar" : "en";
    const translated = await getCatalogCourse(client, otherLocale, slug);
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
      listCatalogCategories(client, locale),
      signedIn ? listMyEnrollments(client) : Promise.resolve<Record<string, CourseEnrollment>>({}),
      countCatalogCourses(client, { locale }),
    ]);
    const category = view === "all" && categoryNames.includes(requestedCategory) ? requestedCategory : null;
    const [categories, { courses, total, page }] = await Promise.all([
      Promise.all(categoryNames.map(async (name) => ({ name, count: await countCatalogCourses(client, { locale, category: name }) }))),
      loadPage(client, { ...options, category, enrollments }),
    ]);

    const entitled = Object.values(enrollments).filter((item) => item.status === "active" || item.status === "completed");
    const durations = await getCatalogCourseDurations(
      client,
      locale,
      courses.map((course) => course.id),
    );
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
  client: Client,
  options: { locale: Locale; search: string; view: CourseFilter["view"]; category: string | null; level: CourseLevel | null; instructor: string | null; requestedPage: number; enrollments: Record<string, CourseEnrollment> },
) {
  const { locale, search, view, category, level, instructor, enrollments } = options;
  let page = options.requestedPage;
  let courses: CatalogCourse[] = [];
  let total = 0;
  if (view === "all") {
    if (instructor) {
      const result = await listCatalogCourses(client, { locale, search, category: category ?? undefined, level: level ?? undefined, limit: 50 });
      const matches = result.courses.filter((course) => course.instructors.some((name) => name === instructor));
      total = matches.length;
      const lastPage = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
      page = Math.min(page, lastPage);
      courses = matches.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
    } else {
      const load = (offset: number) => listCatalogCourses(client, { locale, search, category: category ?? undefined, level: level ?? undefined, limit: CATALOG_PAGE_SIZE, offset });
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
    const { courses: pool } = await listCatalogCourses(client, { locale, search, category: category ?? undefined, level: level ?? undefined, limit: MINE_LIMIT });
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
