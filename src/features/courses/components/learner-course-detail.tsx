import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Check,
  BookOpen,
  ChevronRight,
  CirclePlay,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Layers,
  ListChecks,
  MessageSquare,
  Star,
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
import { AddToCartButton } from "./add-to-cart-button";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { courseImage } from "./course-image";
import { courseHref, lessonHref, pairedVideoChecks } from "./course-links";
import { CourseDetailActions } from "./course-detail-actions";
import {
  CourseContentList,
  LearnerCourseTabs,
  type ModuleGroup,
} from "./learner-course-tabs";
import { getCourseProgress, getUnlockedLessons } from "@/features/learning/server/progress";
import { CompletionControls } from "@/features/learning/components/completion-controls";
import { createClient } from "@/lib/supabase/server";
import {
  FEEDBACK_PAGE_SIZE,
  getCourseFeedbackSummary,
  listCourseQuestions,
  listCourseResources,
  listCourseReviews,
} from "@/features/courses/server/course-feedback";
import { CourseQuestions, CourseReviews } from "./course-feedback";

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
  outline: fullOutline,
  locale,
  enrollment,
  enrollmentError,
  signedIn,
  adminPreview,
}: Props) {
  // Practice checks are answered inside their video's player, so they are not listed as lessons.
  const checks = pairedVideoChecks(fullOutline);
  const videoOfCheck = new Map([...checks].map(([video, check]) => [check, video]));
  const outline = fullOutline.filter((item) => !videoOfCheck.has(item.lessonId));
  const t = await getTranslations("courses");
  const navigationT = await getTranslations("navigation");
  const feedbackT = await getTranslations("courseFeedback");
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
  // Enrolled learners follow the curriculum in order; admins and previews are never sequence-locked.
  const unlocked = enrolled ? await getUnlockedLessons(course.id) : null;
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
        unlocked
          ? unlocked.has(item.lessonId)
            ? lessonHref(course.slug, item.lessonId)
            : null
          : entitled || item.isPreview
            ? lessonHref(course.slug, item.lessonId)
            : null,
      lockedLabel: unlocked ? t("lessonLockedShort") : t("lessonLocked"),
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
        fullOutline.map((item) => item.lessonId),
      )
    : [];
  const lastLessonId = progress[0]?.lesson_id;
  const resumeLesson =
    outline.find((item) => item.lessonId === (videoOfCheck.get(lastLessonId ?? "") ?? lastLessonId)) ??
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

  const client = await createClient();
  const [summary, reviews, questions, resources] = await Promise.all([
    getCourseFeedbackSummary(client, course.id),
    listCourseReviews(client, course.id),
    signedIn ? listCourseQuestions(client, course.id) : Promise.resolve(null),
    listCourseResources(client, course.id, locale),
  ]);
  const access = { signedIn, entitled: enrolled, loginHref };
  const compact = (n: number) =>
    format.number(n, { notation: "compact", numberingSystem: "latn" });
  const paragraphs = (course.description || course.summary)
    .split(/\r?\n/)
    .map((text) => text.trim())
    .filter(Boolean);
  const topics = [
    categoryName,
    level,
    ...Array.from(new Set(outline.map((item) => item.lessonType))).map(
      typeLabel,
    ),
  ].filter((topic): topic is string => Boolean(topic));

  const overview = (
    <>
      <h2>{t("aboutCourse")}</h2>
      {paragraphs.map((text, index) => (
        <p key={index} dir="auto" className="cd-about">
          {text}
        </p>
      ))}
      {topics.length > 0 && (
        <ul className="tags cd-tags" aria-label={feedbackT("topics")}>
          {topics.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ul>
      )}
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

  const reviewsPanel = (
    <CourseReviews
      courseId={course.id}
      locale={locale}
      summary={summary}
      reviews={reviews}
      access={access}
      limit={FEEDBACK_PAGE_SIZE}
    />
  );
  const questionsPanel = (
    <CourseQuestions
      courseId={course.id}
      locale={locale}
      questions={questions}
      questionCount={summary.questionCount}
      access={access}
      limit={FEEDBACK_PAGE_SIZE}
    />
  );
  const resourcesPanel = (
    <>
      <h2>{feedbackT("resourcesTitle")}</h2>
      {!entitled && resources.length > 0 && (
        <p className="cf-access">{feedbackT("resourcesPreviewOnly")}</p>
      )}
      {!signedIn && resources.length > 0 && (
        <p className="cf-access">
          {feedbackT("resourcesSignIn")}{" "}
          <Link className="text-link" href={loginHref}>
            {feedbackT("signIn")}
          </Link>
        </p>
      )}
      {resources.length === 0 ? (
        <p className="cf-empty">
          {entitled
            ? feedbackT("resourcesEmpty")
            : feedbackT("resourcesPreviewOnly")}
        </p>
      ) : (
        <ul className="lesson-resources cd-resources">
          {resources.map((resource) => {
            const external = resource.kind === "external_url";
            const ActionIcon = external ? ExternalLink : Download;
            const content = (
              <>
                <span className="lesson-resource-icon" aria-hidden="true">
                  <FileText size={20} />
                </span>
                <span className="lesson-resource-text">
                  <strong dir="auto">{resource.label}</strong>
                  <small dir="auto">
                    {resource.description ||
                      feedbackT("fromLesson", { title: resource.lessonTitle })}
                  </small>
                </span>
                <ActionIcon
                  size={18}
                  className={`lesson-resource-action${external ? " flip-rtl" : ""}`}
                  aria-hidden="true"
                />
              </>
            );
            return (
              <li key={resource.resourceId}>
                {signedIn ? (
                  <a
                    href={`/api/learning/resources/${resource.resourceId}?lessonId=${resource.lessonId}&locale=${locale}`}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {content}
                  </a>
                ) : (
                  <Link href={loginHref}>{content}</Link>
                )}
              </li>
            );
          })}
        </ul>
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
          </div>
          <div className="cd-hero-media">
            <Image
              src={
                course.slug === "crash-course-odoo-erp" && locale === "ar"
                  ? ASSET_BASE + "odoo-erp-course-ar.webp"
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
        <section className="panel instructor-row cd-instructor-row">
          <Avatar alt={course.instructors[0] ?? marketing.instructor} />
          <div>
            <h3 dir="auto">{instructorName}</h3>
            <p>{feedbackT("instructorRole")}</p>
            {enrolled && (
              <Link
                className="text-link cd-message-instructor"
                href={`/messages?new=${encodeURIComponent(course.slug)}`}
              >
                <MessageSquare size={15} aria-hidden="true" />
                {feedbackT("messageInstructor")}
              </Link>
            )}
          </div>
          <ul className="detail-meta" aria-label={feedbackT("courseStats")}>
            <li>
              <Star className="star" aria-hidden="true" />
              {summary.averageRating !== null ? (
                <span
                  dir="ltr"
                  aria-label={feedbackT("ratingAria", {
                    rating: summary.averageRating.toFixed(1),
                  })}
                >
                  {summary.averageRating.toFixed(1)}
                </span>
              ) : (
                feedbackT("newCourse")
              )}
            </li>
            {totalSeconds > 0 && (
              <li>
                <Clock aria-hidden="true" />
                {duration(totalSeconds)}
              </li>
            )}
            <li>
              <BookOpen aria-hidden="true" />
              {lessonsText}
            </li>
          </ul>
        </section>
        <LearnerCourseTabs
          tabs={[
            { id: "overview", label: t("overviewTab"), content: overview },
            {
              id: "curriculum",
              label: t("curriculumTab"),
              content: curriculum,
            },
            {
              id: "reviews",
              label: feedbackT("tabReviews", {
                count: compact(summary.reviewCount),
              }),
              content: reviewsPanel,
            },
            {
              id: "questions",
              label: feedbackT("tabQuestions", {
                count: compact(summary.questionCount),
              }),
              content: questionsPanel,
            },
            {
              id: "resources",
              label: t("resourcesTab"),
              content: resourcesPanel,
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
              <>
                <Link
                  className="btn primary full"
                  href={`/payment?course=${encodeURIComponent(course.slug)}`}
                >
                  {t("checkout")}
                </Link>
                <AddToCartButton
                  courseSlug={course.slug}
                  courseTitle={course.title}
                  variant="button"
                  className="btn outline full"
                />
              </>
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
