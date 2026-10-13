import Image from "next/image";
import { ArrowRight, BarChart3, BookOpen, ChevronRight, GraduationCap, Tag } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Panel, Title, IconBox } from "@/components/ui/primitives";
import { Community } from "@/components/shared/community-promo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { ASSET_BASE } from "@/lib/assets";
import type { CatalogCourse, CourseEnrollment } from "@/features/courses/server/course-repository";
import { formatMessage, getMarketingMessages } from "@/features/marketing/lib/messages";
import { courseHref } from "./course-links";

const IMAGES = ["course-0.svg", "course-1.svg", "course-2.svg", "course-3.svg", "course-4.svg", "course-5.svg"];
const KNOWN_SLUGS = ["crash-course-odoo-erp", "python-fundamentals", "odoo-development", "odoo-implementation", "odoo-user-guide", "odoo-system-admin"];

/** Approved artwork for the six demo courses; any other course gets a stable pick, never a random one. */
export function courseImage(slug: string) {
  const known = KNOWN_SLUGS.indexOf(slug);
  if (known >= 0) return ASSET_BASE + IMAGES[known];
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ASSET_BASE + IMAGES[hash % IMAGES.length];
}

export type CourseFilter = { view: "all" | "mine" | "newest"; category: string | null; query: string };

export type LearnerCoursesProps = {
  locale: Locale;
  courses: CatalogCourse[];
  enrollments: Record<string, CourseEnrollment>;
  categories: { name: string; count: number }[];
  total: number;
  filter: CourseFilter;
  page: number;
  pages: number;
  signedIn: boolean;
  stats: { enrolled: number; completed: number };
};

function filterHref(next: Partial<CourseFilter> & { page?: number }, current: CourseFilter) {
  const merged = { ...current, ...next };
  const params = new URLSearchParams();
  if (merged.query) params.set("q", merged.query);
  if (merged.view !== "all") params.set("view", merged.view);
  if (merged.category) params.set("category", merged.category);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/courses?${query}` : "/courses";
}

const STATUS_KEY = {
  active: "statusActive",
  completed: "statusCompleted",
  revoked: "statusRevoked",
  expired: "statusExpired",
} as const;

export async function LearnerCourses(props: LearnerCoursesProps) {
  const { locale, courses, enrollments, categories, total, filter, page, pages, signedIn, stats } = props;
  const t = await getTranslations("courses");
  const format = await getFormatter();
  const marketing = getMarketingMessages(locale);
  const categoryName = (value: string) => marketing.catalog.categoryNames[value as keyof typeof marketing.catalog.categoryNames] ?? value;
  const levelName = (value: string | null) =>
    value === "beginner" ? t("beginner") : value === "intermediate" ? t("intermediate") : value === "advanced" ? t("advanced") : null;
  const priceText = (course: CatalogCourse) =>
    course.priceMinor === 0
      ? t("free")
      : format.number(course.priceMinor / 100, { style: "currency", currency: course.currency, numberingSystem: "latn", maximumFractionDigits: 0 });

  const pills: { key: string; label: string; selected: boolean; href: string }[] = [
    { key: "all", label: t("allCourses"), selected: filter.view === "all" && !filter.category, href: filterHref({ view: "all", category: null }, filter) },
    ...(signedIn
      ? [{ key: "mine", label: t("myCourses"), selected: filter.view === "mine", href: filterHref({ view: "mine", category: null }, filter) }]
      : []),
    ...categories.map((item) => ({
      key: `category-${item.name}`,
      label: categoryName(item.name),
      selected: filter.view !== "mine" && filter.category === item.name,
      href: filterHref({ view: "all", category: item.name }, filter),
    })),
    { key: "newest", label: t("newestFilter"), selected: filter.view === "newest", href: filterHref({ view: "newest", category: null }, filter) },
  ];

  return (
    <div className="columns courses-columns">
      <div>
        <div className="filter-bar learner-filter-bar">
          <nav className="pills" aria-label={t("filter")}>
            {pills.map((pill) => (
              <Link key={pill.key} href={pill.href} className={pill.selected ? "selected" : ""} aria-current={pill.selected ? "page" : undefined}>
                {pill.label}
              </Link>
            ))}
          </nav>
          <form className="sort" action={`/${locale}/courses`} method="get" role="search">
            <input type="search" name="q" defaultValue={filter.query} maxLength={100} placeholder={marketing.catalog.searchPlaceholder} aria-label={marketing.catalog.searchLabel} />
            {filter.view !== "all" && <input type="hidden" name="view" value={filter.view} />}
            {filter.category && <input type="hidden" name="category" value={filter.category} />}
          </form>
        </div>

        <p className="learner-results" aria-live="polite">
          {formatMessage(locale, marketing.catalog.results, { n: total, count: String(total) })}
        </p>

        {courses.length === 0 ? (
          <Panel>
            <h3>{filter.view === "mine" ? t("noMyCourses") : t("noCoursesTitle")}</h3>
            <p>{t("trySearchCategory")}</p>
            <Link className="btn" href="/courses">{t("clearCategory")}</Link>
          </Panel>
        ) : (
          <div className="course-grid">
            {courses.map((course, index) => {
              const enrollment = enrollments[course.id];
              const status = enrollment ? STATUS_KEY[enrollment.status] : null;
              const entitled = enrollment && (enrollment.status === "active" || enrollment.status === "completed");
              const level = levelName(course.level);
              return (
                <article className="course-card panel learner-course-card" key={course.id} data-testid="learner-course-card">
                  <Link href={courseHref(course.slug)} className="course-image" tabIndex={-1} aria-hidden="true">
                    <Image src={courseImage(course.slug)} alt="" fill loading={index < 3 ? "eager" : "lazy"} sizes="(max-width: 700px) 100vw, (max-width: 1350px) 50vw, 33vw" />
                    {status ? <span className={`badge status-${enrollment?.status}`}>{t(status)}</span> : <span className="badge">{priceText(course)}</span>}
                  </Link>
                  <div className="course-body">
                    <h3 dir="auto"><Link href={courseHref(course.slug)}>{course.title}</Link></h3>
                    <p dir="auto">{course.summary}</p>
                    <div className="teacher">
                      <span className="teacher-mark" aria-hidden="true"><GraduationCap size={20} /></span>
                      <div>
                        <b dir="auto">{course.instructors.length ? course.instructors.join(", ") : marketing.catalog.instructorLabel}</b>
                        {course.category && <small>{categoryName(course.category)}</small>}
                      </div>
                    </div>
                    <div className="course-meta">
                      {level && <span><BarChart3 size={15} aria-hidden="true" />{level}</span>}
                      {course.category && <span><BookOpen size={15} aria-hidden="true" />{categoryName(course.category)}</span>}
                      <span><Tag size={15} aria-hidden="true" />{priceText(course)}</span>
                    </div>
                    <Link className={`btn ${entitled ? "" : "outline"}`} href={courseHref(course.slug)}>
                      {entitled ? t("startLearning") : t("viewCourse")} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <nav className="course-pagination" aria-label={marketing.catalog.paginationLabel}>
            {page > 1 && <Link className="btn outline" href={filterHref({ page: page - 1 }, filter)}>{t("previous")}</Link>}
            <span>{t("pageOf", { page: String(page), pages: String(pages) })}</span>
            {page < pages && <Link className="btn outline" href={filterHref({ page: page + 1 }, filter)}>{t("next")}</Link>}
          </nav>
        )}
      </div>

      <aside className="right-rail">
        {signedIn && (
          <Panel className="learning-stats">
            <Title>{t("learningTitle")}</Title>
            <div className="stat-pair">
              <div><strong>{format.number(stats.enrolled, { numberingSystem: "latn" })}</strong><small>{t("statEnrolled")}</small></div>
              <div><strong>{format.number(stats.completed, { numberingSystem: "latn" })}</strong><small>{t("statCompleted")}</small></div>
            </div>
          </Panel>
        )}
        <Panel>
          <Title>{t("categories")}</Title>
          <Link className="category-row" href={filterHref({ view: "all", category: null }, filter)}>
            <IconBox icon={BookOpen} color="red" />
            <span><strong>{t("allCourses")}</strong><small>{format.number(categories.reduce((sum, item) => sum + item.count, 0) || total, { numberingSystem: "latn" })} {t("courseUnit")}</small></span>
            <ChevronRight size={19} className="flip-rtl" aria-hidden="true" />
          </Link>
          {categories.map((item, index) => (
            <Link className="category-row" key={item.name} href={filterHref({ view: "all", category: item.name }, filter)}>
              <IconBox icon={index % 2 === 0 ? BarChart3 : GraduationCap} color={["blue", "purple", "green", "orange"][index % 4]} />
              <span><strong>{categoryName(item.name)}</strong><small>{format.number(item.count, { numberingSystem: "latn" })} {t("courseUnit")}</small></span>
              <ChevronRight size={19} className="flip-rtl" aria-hidden="true" />
            </Link>
          ))}
        </Panel>
        <Community />
      </aside>
    </div>
  );
}
