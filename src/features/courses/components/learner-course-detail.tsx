import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CirclePlay,
  Clock,
  Eye,
  Layers,
  ListChecks,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Panel, Title } from "@/components/ui/primitives";
import { Avatar } from "@/components/shared/profile-avatar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { ASSET_BASE } from "@/lib/assets";
import type {
  CatalogCourseDetail,
  CatalogOutlineLesson,
  CourseEnrollment,
} from "@/features/courses/server/course-repository";
import { enrollFreeCourseAction } from "@/features/courses/server/enrollment-actions";
import { EnrollmentSubmitButton } from "@/features/marketing/components/course/enrollment-submit-button";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { courseImage } from "./course-image";
import { courseHref, lessonHref } from "./course-links";
import { CourseDetailActions } from "./course-detail-actions";
import {
  CourseContentList,
  LearnerCourseTabs,
  type ModuleGroup,
} from "./learner-course-tabs";
import { demoFeaturesEnabled } from "@/lib/features";
import { getCourseProgress } from "@/features/learning/server/progress";
import { CompletionControls } from "@/features/learning/components/completion-controls";

type Props = {
  course: CatalogCourseDetail;
  outline: CatalogOutlineLesson[];
  locale: Locale;
  enrollment: CourseEnrollment | null;
  enrollmentError: boolean;
  signedIn: boolean;
  adminPreview: boolean;
};

type Fact = { icon: typeof Clock; text: string };

export async function LearnerCourseDetail({
  course,
  outline,
  locale,
  enrollment,
  enrollmentError,
  signedIn,
  adminPreview,
}: Props) {
  const t = await getTranslations("courses");
  const navigationT = await getTranslations("navigation");
  const format = await getFormatter();
  const messages = getMarketingMessages(locale);
  const marketing = messages.course;
  const categories = messages.catalog.categoryNames;
  const categoryName = course.category
    ? (categories[course.category as keyof typeof categories] ??
      course.category)
    : null;
  const level =
    course.level === "beginner"
      ? t("beginner")
      : course.level === "intermediate"
        ? t("intermediate")
        : course.level === "advanced"
          ? t("advanced")
          : null;
  const duration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0
      ? t("durationHm", { h: String(h), m: String(m) })
      : t("durationM", { m: String(Math.max(minutes, 1)) });
  };

  const enrolled =
    enrollment?.status === "active" || enrollment?.status === "completed";
  const adminOnlyPreview = adminPreview && !enrolled;
  const entitled = enrolled || adminOnlyPreview;
  const typeLabel = (type: string) =>
    type === "video"
      ? t("lessonTypeVideo")
      : type === "assessment"
        ? t("lessonTypeAssessment")
        : type === "resource"
          ? t("lessonTypeResource")
          : t("lessonTypeArticle");

  const modules: ModuleGroup[] = [];
  for (const item of outline) {
    let group = modules.find((module) => module.id === item.moduleId);
    if (!group) {
      group = {
        id: item.moduleId,
        title: item.moduleTitle,
        meta: "",
        lessons: [],
      };
      modules.push(group);
    }
    group.lessons.push({
      id: item.lessonId,
      title: item.lessonTitle,
      preview: item.isPreview,
      previewLabel: marketing.previewLesson,
      type: item.lessonType,
      typeLabel: typeLabel(item.lessonType),
      duration: item.durationSeconds ? duration(item.durationSeconds) : null,
      href:
        entitled || item.isPreview
          ? lessonHref(course.slug, item.lessonId)
          : null,
      lockedLabel: t("lessonLocked"),
    });
  }
  for (const group of modules) {
    const seconds = outline
      .filter((item) => item.moduleId === group.id)
      .reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
    group.meta = [
      t("lessonsTotal", { n: group.lessons.length }),
      seconds > 0 ? duration(seconds) : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const totalSeconds = outline.reduce(
    (sum, item) => sum + (item.durationSeconds ?? 0),
    0,
  );
  const previewCount = outline.filter((item) => item.isPreview).length;
  const price =
    course.priceMinor === 0
      ? t("free")
      : format.number(course.priceMinor / 100, {
          style: "currency",
          currency: course.currency,
          numberingSystem: "latn",
          maximumFractionDigits: 0,
        });
  const progress = enrolled
    ? await getCourseProgress(
        course.id,
        outline.map((item) => item.lessonId),
      )
    : [];
  const resumeLesson =
    outline.find((item) => item.lessonId === progress[0]?.lesson_id) ??
    outline[0];
  const required = outline.filter((item) => item.isRequired);
  const completedRequired = required.filter((item) =>
    progress.some(
      (row) => row.lesson_id === item.lessonId && row.status === "completed",
    ),
  ).length;
  const progressPercent = required.length
    ? Math.min(100, Math.floor((completedRequired / required.length) * 100))
    : 0;
  const statusKey = {
    active: "statusActive",
    completed: "statusCompleted",
    revoked: "statusRevoked",
    expired: "statusExpired",
    refunded: "statusRefunded",
  } as const;
  const statusLabel = adminOnlyPreview
    ? t("adminPreview")
    : enrollment
      ? t(statusKey[enrollment.status])
      : null;
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}${courseHref(course.slug)}`)}`;
  const instructorName = course.instructors.length
    ? course.instructors.join(", ")
    : marketing.instructor;

  const lessonsText = t("lessonsTotal", { n: outline.length });
  const modulesText = t("modulesCount", { n: modules.length });
  const facts = [
    outline.length > 0 && { icon: ListChecks, text: lessonsText },
    modules.length > 0 && { icon: Layers, text: modulesText },
    totalSeconds > 0 && { icon: Clock, text: duration(totalSeconds) },
    level && { icon: BarChart3, text: level },
  ].filter((fact): fact is Fact => Boolean(fact));
  const includes = [
    outline.length > 0 && { icon: ListChecks, text: lessonsText },
    modules.length > 0 && { icon: Layers, text: modulesText },
    totalSeconds > 0 && {
      icon: CirclePlay,
      text: t("contentDuration", { time: duration(totalSeconds) }),
    },
    previewCount > 0 && {
      icon: Eye,
      text: t("previewCount", { n: previewCount }),
    },
  ].filter((fact): fact is Fact => Boolean(fact));

  const overview = (
    <>
      <h2>{t("aboutCourse")}</h2>
      <p dir="auto" className="cd-about">
        {course.description || course.summary}
      </p>
      {modules.length > 0 && (
        <>
          <h2>{t("whatYoullLearn")}</h2>
          <ul className="cd-learn">
            {modules.map((group) => (
              <li key={group.id}>
                <Check size={18} aria-hidden="true" />
                <span dir="auto">{group.title}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
  const curriculum = (
    <>
      <h2>{t("courseCurriculum")}</h2>
      {modules.length === 0 ? (
        <p>{marketing.outlineEmpty}</p>
      ) : (
        <CourseContentList
          modules={modules}
          expandLabel={t("expandAll")}
          collapseLabel={t("collapseAll")}
          summary={[
            modulesText,
            lessonsText,
            totalSeconds > 0 ? duration(totalSeconds) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      )}
    </>
  );

  return (
    <div className="columns detail-columns learner-detail">
      <div className="primary">
        {enrolled && (
          <CompletionControls courseId={course.id} locale={locale} />
        )}
        <section className="cd-hero">
          <div className="cd-hero-grid">
          <div className="cd-hero-copy">
            <nav
              className="course-breadcrumb"
              aria-label={navigationT("courseBreadcrumb")}
            >
              <Link href="/catalog">{navigationT("ourCourses")}</Link>
              <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
              <Link href="/courses">{t("allCourses")}</Link>
              <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
              <span dir="auto" aria-current="page">
                {course.title}
              </span>
            </nav>
            {(categoryName || statusLabel) && (
              <div className="cd-pills">
                {categoryName && <span className="cd-pill">{categoryName}</span>}
                {statusLabel && (
                  <span className="cd-pill status">{statusLabel}</span>
                )}
              </div>
            )}
            <div className="course-title-row">
              <h1 dir="auto">{course.title}</h1>
              <CourseDetailActions slug={course.slug} />
            </div>
            <p className="cd-summary" dir="auto">
              {course.summary}
            </p>
            {facts.length > 0 && (
              <ul className="cd-facts" aria-label={t("courseDetailsLabel")}>
                {facts.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <Icon size={17} aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            )}
            <div className="cd-instructor">
              <Avatar alt={course.instructors[0] ?? marketing.instructor} />
              <span>
                <small>{marketing.instructor}</small>
                <strong dir="auto">{instructorName}</strong>
              </span>
            </div>
          </div>
          <div className="cd-hero-media">
            <Image
              src={
                course.slug === "crash-course-odoo-erp"
                  ? locale === "ar"
                    ? ASSET_BASE + "odoo-erp-course-ar.png"
                    : ASSET_BASE + "learner-hero.png"
                  : courseImage(course.slug)
              }
              alt=""
              fill
              priority
              sizes="(max-width: 900px) 100vw, 40vw"
            />
          </div>
          </div>
        </section>
        <LearnerCourseTabs
          tabs={[
            { id: "overview", label: t("overviewTab"), content: overview },
            {
              id: "curriculum",
              label: t("curriculumTab"),
              content: curriculum,
            },
          ]}
        />
      </div>

      <aside className="right-rail">
        <section className="cd-enroll" aria-labelledby="cd-enroll-title">
          <h2 id="cd-enroll-title" className="visually-hidden">
            {t("enrollmentTitle")}
          </h2>
          {entitled ? (
            <div className="cd-progress">
              <div className="cd-progress-top">
                <span>{t("yourProgress")}</span>
                <strong dir="ltr">{progressPercent}%</strong>
              </div>
              <div
                className="cd-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label={t("yourProgress")}
              >
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="enroll-note">
                {t("completedRequired", {
                  count: completedRequired,
                  total: required.length,
                })}
              </p>
            </div>
          ) : (
            <div className="cd-price">
              <small>{t("priceLabel")}</small>
              <strong>{price}</strong>
            </div>
          )}
          {enrollmentError && (
            <p role="alert" className="enroll-note error">
              {marketing.enrollmentUnavailable}
            </p>
          )}
          {adminOnlyPreview && (
            <p role="status" className="enroll-note">
              {t("adminPreviewNotice")}
            </p>
          )}
          {enrollment?.status === "active" && (
            <p
              role="status"
              className="enroll-note ok"
              data-testid="course-enrollment-active"
            >
              <Check size={16} aria-hidden="true" />{" "}
              {marketing.enrollmentActive}
            </p>
          )}
          {enrollment?.status === "completed" && (
            <p
              role="status"
              className="enroll-note ok"
              data-testid="course-enrollment-active"
            >
              <Check size={16} aria-hidden="true" />{" "}
              {marketing.enrollmentCompleted}
            </p>
          )}
          {enrollment?.status === "revoked" && (
            <p role="status" className="enroll-note">
              {marketing.enrollmentRevoked}
            </p>
          )}
          {enrollment?.status === "expired" && (
            <p role="status" className="enroll-note">
              {marketing.enrollmentExpired}
            </p>
          )}
          {!enrollment && !enrollmentError && !adminOnlyPreview && (
            <p className="enroll-note">{t("notEnrolledYet")}</p>
          )}
          <div className="cd-actions">
            {entitled && resumeLesson && (
              <Link
                className="btn"
                href={lessonHref(course.slug, resumeLesson.lessonId)}
                data-testid="course-start-learning"
              >
                {t("startLearning")}{" "}
                <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
              </Link>
            )}
            {course.priceMinor === 0 &&
              enrollment?.status !== "active" &&
              (signedIn ? (
                <form
                  action={enrollFreeCourseAction.bind(
                    null,
                    course.id,
                    locale,
                    course.slug,
                  )}
                >
                  <EnrollmentSubmitButton
                    className={entitled ? "btn outline" : "btn"}
                    label={
                      enrollment?.status === "completed"
                        ? marketing.enrollAgain
                        : marketing.enrollFree
                    }
                    pendingLabel={marketing.enrollmentSubmitting}
                    pendingAnnouncement={
                      marketing.enrollmentSubmittingAnnouncement
                    }
                  />
                </form>
              ) : (
                <Link className="btn" href={loginHref}>
                  {t("loginToEnroll")}
                </Link>
              ))}
            {course.priceMinor > 0 && !entitled && (
              <Link
                className="btn primary full"
                href={`/payment?course=${encodeURIComponent(course.slug)}`}
              >
                {t("checkout")}
              </Link>
            )}
          </div>
          {includes.length > 0 && (
            <div className="cd-includes">
              <h3>{t("courseIncludes")}</h3>
              <ul>
                {includes.map(({ icon: Icon, text }) => (
                  <li key={text}>
                    <Icon size={18} aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {demoFeaturesEnabled && (
          <Panel className="ai-small">
            <Title>{t("courseAi")}</Title>
            <p>{t("courseContext")}</p>
            <div className="course-ai">
              <Image
                src={ASSET_BASE + "ai-character.png"}
                alt=""
                width={512}
                height={512}
              />
            </div>
            <Link className="btn outline" href="/ai-page">
              {t("openAssistant")}{" "}
              <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
            </Link>
          </Panel>
        )}
      </aside>
    </div>
  );
}

export async function LearnerCourseUnavailable({
  locale,
  slug,
  availableLocale,
}: {
  locale: Locale;
  slug: string;
  availableLocale: Locale | null;
}) {
  const t = await getTranslations("courses");
  const copy = getMarketingMessages(locale).course;
  return (
    <Panel>
      <div data-testid="course-unavailable">
        <Link className="text-link back-link" href="/courses">
          <ArrowRight
            size={16}
            className="flip-rtl back-arrow"
            aria-hidden="true"
          />{" "}
          {t("backToCourses")}
        </Link>
        <h1>{copy.unavailableTitle}</h1>
        <p>{copy.unavailableDescription}</p>
        {availableLocale && (
          <Link
            className="btn"
            href={courseHref(slug)}
            locale={availableLocale}
          >
            {availableLocale === "en" ? copy.viewInEnglish : copy.viewInArabic}
          </Link>
        )}
      </div>
    </Panel>
  );
}
