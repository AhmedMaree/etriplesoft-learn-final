import { notFound } from "next/navigation";
import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { Panel } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/server";
import { isLocale, type Locale } from "@/i18n/config";
import {
  CATALOG_PAGE_SIZE,
  COURSE_SLUG_PATTERN,
  getCatalogCourse,
  getCatalogCourseOutline,
  getCourseEnrollment,
  listCatalogCategories,
  listCatalogCourses,
  listMyEnrollments,
  type CatalogCourse,
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
  const { data: auth } = await client.auth.getUser();
  const signedIn = Boolean(auth.user);

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
      />
    );
  }

  const search = (first(query.q) ?? "").trim().slice(0, 100);
  const requestedView = first(query.view);
  const view: CourseFilter["view"] = requestedView === "newest" || (requestedView === "mine" && signedIn) ? requestedView : "all";
  const list = await loadList(client, {
    locale,
    search,
    view,
    requestedCategory: (first(query.category) ?? "").trim(),
    requestedPage: pageNumber(first(query.page)),
    signedIn,
  });

  return (
    <>
      <PageHeading page="courses" title="" subtitle="" />
      {list ? (
        <LearnerCourses
          locale={locale}
          courses={list.courses}
          enrollments={list.enrollments}
          categories={list.categories}
          total={list.total}
          filter={{ view, category: list.category, query: search }}
          page={list.page}
          pages={Math.max(1, Math.ceil(list.total / CATALOG_PAGE_SIZE))}
          signedIn={signedIn}
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
  options: { locale: Locale; search: string; view: CourseFilter["view"]; requestedCategory: string; requestedPage: number; signedIn: boolean },
) {
  const { locale, search, view, requestedCategory, signedIn } = options;
  try {
    const categoryNames = await listCatalogCategories(client, locale);
    const category = view === "all" && categoryNames.includes(requestedCategory) ? requestedCategory : null;
    const [categories, enrollments] = await Promise.all([
      Promise.all(categoryNames.map(async (name) => ({ name, count: (await listCatalogCourses(client, { locale, category: name, limit: 1 })).total }))),
      signedIn ? listMyEnrollments(client) : Promise.resolve<Record<string, CourseEnrollment>>({}),
    ]);

    let page = options.requestedPage;
    let courses: CatalogCourse[];
    let total: number;
    if (view === "all") {
      const load = (offset: number) => listCatalogCourses(client, { locale, search, category: category ?? undefined, limit: CATALOG_PAGE_SIZE, offset });
      let result = await load((page - 1) * CATALOG_PAGE_SIZE);
      const lastPage = Math.max(1, Math.ceil(result.total / CATALOG_PAGE_SIZE));
      if (page > lastPage) {
        page = lastPage;
        result = await load((page - 1) * CATALOG_PAGE_SIZE);
      }
      courses = result.courses;
      total = result.total;
    } else {
      // "Mine" and "Newest" work on a bounded set so the ordering/filter is exact for this page size.
      const { courses: pool } = await listCatalogCourses(client, { locale, search, limit: MINE_LIMIT });
      let list = view === "mine" ? pool.filter((course) => enrollments[course.id]) : [...pool];
      if (view === "newest") list.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
      total = list.length;
      const lastPage = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
      page = Math.min(page, lastPage);
      list = list.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
      courses = list;
    }

    const entitled = Object.values(enrollments).filter((item) => item.status === "active" || item.status === "completed");
    return {
      courses,
      total,
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
