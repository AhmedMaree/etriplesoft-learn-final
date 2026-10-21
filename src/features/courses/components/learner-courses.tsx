import Image from "next/image";
import allCoursesArtwork from "../../../../public/assets/all-courses-art-clear.png";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Tag,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Panel, Title, IconBox } from "@/components/ui/primitives";
import { Community } from "@/components/shared/community-promo";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type {
  CatalogCourse,
  CourseEnrollment,
} from "@/features/courses/server/course-repository";
import {
  formatMessage,
  getMarketingMessages,
} from "@/features/marketing/lib/messages";
import { courseHref } from "./course-links";
import { courseImage } from "./course-image";
import { LearnerCourseToolbar } from "./learner-course-toolbar";
import { AddToCartButton } from "./add-to-cart-button";

export type CourseFilter = {
  view: "all" | "mine" | "newest";
  category: string | null;
  level: string | null;
  instructor: string | null;
  query: string;
  sort: "relevant" | "newest";
};

export type LearnerCoursesProps = {
  locale: Locale;
  courses: CatalogCourse[];
  enrollments: Record<string, CourseEnrollment>;
  categories: { name: string; count: number }[];
  total: number;
  catalogTotal: number;
  filter: CourseFilter;
  page: number;
  pages: number;
  signedIn: boolean;
  adminPreview: boolean;
  stats: { enrolled: number; completed: number };
};

function filterHref(
  next: Partial<CourseFilter> & { page?: number },
  current: CourseFilter,
) {
  const merged = { ...current, ...next };
  const params = new URLSearchParams();
  if (merged.query) params.set("q", merged.query);
  if (merged.view !== "all") params.set("view", merged.view);
  if (merged.category) params.set("category", merged.category);
  if (merged.level) params.set("level", merged.level);
  if (merged.instructor) params.set("instructor", merged.instructor);
  if (merged.sort !== "relevant") params.set("sort", merged.sort);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/courses?${query}` : "/courses";
}

const STATUS_KEY = {
  active: "statusActive",
  completed: "statusCompleted",
  revoked: "statusRevoked",
  expired: "statusExpired",
  refunded: "statusRefunded",
} as const;

export async function LearnerCourses(props: LearnerCoursesProps) {
  const {
    locale,
    courses,
    enrollments,
    categories,
    total,
    catalogTotal,
    filter,
    page,
    pages,
    signedIn,
    adminPreview,
    stats,
  } = props;
  const t = await getTranslations("courses");
  const format = await getFormatter();
  const marketing = getMarketingMessages(locale);
  const categoryName = (value: string) =>
    marketing.catalog.categoryNames[
      value as keyof typeof marketing.catalog.categoryNames
    ] ?? value;
  const levelName = (value: string | null) =>
    value === "beginner"
      ? t("beginner")
      : value === "intermediate"
        ? t("intermediate")
        : value === "advanced"
          ? t("advanced")
          : null;
  const priceText = (course: CatalogCourse) =>
    course.priceMinor === 0
      ? t("free")
      : format.number(course.priceMinor / 100, {
          style: "currency",
          currency: course.currency,
          numberingSystem: "latn",
          maximumFractionDigits: 0,
        });
  const durationText = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return null;
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return t("durationM", { m: String(Math.max(minutes, 1)) });
    return remainingMinutes === 0
      ? t("durationHours", { h: String(hours) })
      : t("durationHm", { h: String(hours), m: String(remainingMinutes) });
  };

  const instructors = Array.from(new Set(courses.flatMap((course) => course.instructors))).sort((a, b) => a.localeCompare(b, locale));
  const levels = [
    { value: "beginner", label: t("beginner") },
    { value: "intermediate", label: t("intermediate") },
    { value: "advanced", label: t("advanced") },
  ];

  const count = (value: number) => format.number(value, { numberingSystem: "latn" });
  const pills: {
    key: string;
    label: string;
    count?: string;
    selected: boolean;
    href: string;
  }[] = [
    {
      key: "all",
      label: t("allCourses"),
      count: count(catalogTotal),
      selected: filter.view === "all" && !filter.category,
      href: filterHref({ view: "all", category: null }, filter),
    },
    ...(signedIn
      ? [{
          key: "mine",
          label: t("myCoursesFilter"),
          count: count(stats.enrolled),
          selected: filter.view === "mine",
          href: filterHref({ view: "mine", category: null }, filter),
        }]
      : []),
    ...categories.map((item) => ({
      key: `category-${item.name}`,
      label: categoryName(item.name),
      count: count(item.count),
      selected: filter.view !== "mine" && filter.view !== "newest" && filter.category === item.name,
      href: filterHref({ view: "all", category: item.name }, filter),
    })),
    {
      key: "newest",
      label: t("newestFilter"),
      selected: filter.view === "newest",
      href: filterHref({ view: "newest", category: null, sort: "newest" }, filter),
    },
  ];

  return (
    <div className="columns courses-columns">
      <div className="courses-main-column">
        <section className="courses-hero" aria-labelledby="courses-title">
          <div className="courses-hero-copy">
            <p className="courses-eyebrow">{t("heroEyebrow")}</p>
            <h1 id="courses-title">{t("heroTitle")}</h1>
            <p className="courses-hero-lead">{t("heroDescription")}</p>
          </div>
          <div className="courses-hero-art" aria-hidden="true">
            <Image src={allCoursesArtwork} alt="" fill priority sizes="(max-width: 700px) 48vw, 34vw" />
          </div>
        </section>

        <nav className="courses-tabs" aria-label={t("filter")}>
          {pills.map((pill) => (
            <Link
              key={pill.key}
              href={pill.href}
              className={pill.selected ? "selected" : ""}
              aria-current={pill.selected ? "page" : undefined}
            >
              {pill.label}
              {pill.count !== undefined && <span className="courses-tab-count" aria-hidden="true">{pill.count}</span>}
            </Link>
          ))}
        </nav>

        <LearnerCourseToolbar
          query={filter.query}
          category={filter.category ?? ""}
          level={filter.level ?? ""}
          instructor={filter.instructor ?? ""}
          sort={filter.sort}
          categories={categories.map(({ name }) => ({ value: name, label: categoryName(name) }))}
          levels={levels}
          instructors={instructors}
          labels={{
            search: t("searchPlaceholder"),
            clearSearch: t("clearSearch"),
            categories: t("allCategories"),
            levels: t("allLevels"),
            instructors: t("allInstructors"),
            sort: t("sort"),
            relevance: t("mostRelevant"),
            newest: t("newestFilter"),
          }}
        />

        <p className="learner-results sr-only" aria-live="polite">
          {formatMessage(locale, marketing.catalog.results, {
            n: total,
            count: String(total),
          })}
        </p>

        {courses.length === 0 ? (
          <Panel>
            <h3>
              {filter.view === "mine" ? t("noMyCourses") : t("noCoursesTitle")}
            </h3>
            <p>{t("trySearchCategory")}</p>
            <Link className="btn" href="/courses">
              {t("clearCategory")}
            </Link>
          </Panel>
        ) : (
          <div className="course-grid">
            {courses.map((course, index) => {
              const enrollment = enrollments[course.id];
              const status = enrollment ? STATUS_KEY[enrollment.status] : null;
              const entitled =
                enrollment &&
                (enrollment.status === "active" ||
                  enrollment.status === "completed");
              const level = levelName(course.level);
              return (
                <article
                  className="course-card panel learner-course-card"
                  key={course.id}
                  data-testid="learner-course-card"
                >
                  <Link
                    href={courseHref(course.slug)}
                    className="course-image"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <Image
                      src={courseImage(course.slug)}
                      alt=""
                      fill
                      loading={index < 3 ? "eager" : "lazy"}
                      sizes="(max-width: 700px) 100vw, (max-width: 1350px) 50vw, 33vw"
                    />
                    {adminPreview && !entitled ? (
                      <span className="badge">{t("adminPreview")}</span>
                    ) : status ? (
                      <span className={`badge status-${enrollment?.status}`}>
                        {t(status)}
                      </span>
                    ) : (
                      <span className="badge">{priceText(course)}</span>
                    )}
                  </Link>
                  <div className="course-body">
                    <h2 dir="auto">
                      <Link href={courseHref(course.slug)}>{course.title}</Link>
                    </h2>
                    <p dir="auto">{course.summary}</p>
                    <div className="teacher">
                      <span className="teacher-mark" aria-hidden="true">
                        <GraduationCap size={20} />
                      </span>
                      <div>
                        <b dir="auto">
                          {course.instructors.length
                            ? course.instructors.join(", ")
                            : marketing.catalog.instructorLabel}
                        </b>
                        {course.category && (
                          <small>{categoryName(course.category)}</small>
                        )}
                      </div>
                    </div>
                    <div className="course-meta">
                      {level && (
                        <span>
                          <BarChart3 size={15} aria-hidden="true" />
                          {level}
                        </span>
                      )}
                      {course.category && (
                        <span>
                          <BookOpen size={15} aria-hidden="true" />
                          {categoryName(course.category)}
                        </span>
                      )}
                      {durationText(course.durationSeconds) && (
                        <span aria-label={`${t("duration")}: ${durationText(course.durationSeconds)}`}>
                          <Clock size={15} aria-hidden="true" />
                          {durationText(course.durationSeconds)}
                        </span>
                      )}
                      <span>
                        <Tag size={15} aria-hidden="true" />
                        {priceText(course)}
                      </span>
                    </div>
                    <div className="course-actions">
                      <Link
                        className="btn"
                        href={courseHref(course.slug)}
                        data-testid={entitled || adminPreview ? "course-start-learning" : "course-enroll-now"}
                      >
                        {entitled
                          ? t("startLearning")
                          : adminPreview
                            ? t("previewCourse")
                            : t("enroll")}{" "}
                        <ArrowRight
                          size={18}
                          className="flip-rtl"
                          aria-hidden="true"
                        />
                      </Link>
                      {!entitled && !adminPreview && course.priceMinor > 0 && (
                        <AddToCartButton
                          courseSlug={course.slug}
                          courseTitle={course.title}
                        />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <nav
            className="course-pagination"
            aria-label={marketing.catalog.paginationLabel}
          >
            {page > 1 && (
              <Link
                className="btn outline"
                href={filterHref({ page: page - 1 }, filter)}
              >
                {t("previous")}
              </Link>
            )}
            <span>
              {t("pageOf", { page: String(page), pages: String(pages) })}
            </span>
            {page < pages && (
              <Link
                className="btn outline"
                href={filterHref({ page: page + 1 }, filter)}
              >
                {t("next")}
              </Link>
            )}
          </nav>
        )}
      </div>

      <aside className="right-rail">
        {signedIn && (
          <Panel className="learning-stats">
            <div className="section-title">
              <h2>{t("learningTitle")}</h2>
              <Link className="text-link" href="/overview">
                {t("viewProgress")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
              </Link>
            </div>
            <div className="stat-pair">
              <div className="enrolled-stat">
                <BookOpen aria-hidden="true" />
                <strong>
                  {format.number(stats.enrolled, { numberingSystem: "latn" })}
                </strong>
                <small>{t("statEnrolled")}</small>
              </div>
              <div className="completed-stat">
                <CheckCircle2 aria-hidden="true" />
                <strong>
                  {format.number(stats.completed, { numberingSystem: "latn" })}
                </strong>
                <small>{t("statCompleted")}</small>
              </div>
            </div>
          </Panel>
        )}
        <Panel>
          <Title>{t("categories")}</Title>
          <Link
            className="category-row"
            href={filterHref({ view: "all", category: null }, filter)}
          >
            <IconBox icon={BookOpen} color="red" />
            <span>
              <strong>{t("allCourses")}</strong>
              <small>
                {format.number(
                  categories.reduce((sum, item) => sum + item.count, 0) ||
                    total,
                  { numberingSystem: "latn" },
                )}{" "}
                {t("courseUnit")}
              </small>
            </span>
            <ChevronRight size={19} className="flip-rtl" aria-hidden="true" />
          </Link>
          {categories.map((item, index) => (
            <Link
              className="category-row"
              key={item.name}
              href={filterHref({ view: "all", category: item.name }, filter)}
            >
              <IconBox
                icon={index % 2 === 0 ? BarChart3 : GraduationCap}
                color={["blue", "purple", "green", "orange"][index % 4]}
              />
              <span>
                <strong>{categoryName(item.name)}</strong>
                <small>
                  {format.number(item.count, { numberingSystem: "latn" })}{" "}
                  {t("courseUnit")}
                </small>
              </span>
              <ChevronRight size={19} className="flip-rtl" aria-hidden="true" />
            </Link>
          ))}
        </Panel>
        <Community title={t("communityTitle")} description={t("communityDescription")} action={t("visitCommunityAction")} />
      </aside>
    </div>
  );
}
