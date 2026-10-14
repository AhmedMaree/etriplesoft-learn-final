import Image from "next/image";
import { ArrowRight, BarChart3, BookOpen, Check, ChevronRight, Clock, ListChecks, Tag } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Panel, Title } from "@/components/ui/primitives";
import { Avatar } from "@/components/shared/profile-avatar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { ASSET_BASE } from "@/lib/assets";
import type { CatalogCourseDetail, CatalogOutlineLesson, CourseEnrollment } from "@/features/courses/server/course-repository";
import { enrollFreeCourseAction } from "@/features/courses/server/enrollment-actions";
import { EnrollmentSubmitButton } from "@/features/marketing/components/course/enrollment-submit-button";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { courseImage } from "./learner-courses";
import { courseHref, lessonHref } from "./course-links";
import { CourseDetailActions } from "./course-detail-actions";
import { CourseContentList, LearnerCourseTabs, type ModuleGroup } from "./learner-course-tabs";
import { getCourseProgress } from '@/features/learning/server/progress';
import { CompletionControls } from '@/features/learning/components/completion-controls';

type Props = {
  course: CatalogCourseDetail;
  outline: CatalogOutlineLesson[];
  locale: Locale;
  enrollment: CourseEnrollment | null;
  enrollmentError: boolean;
  signedIn: boolean;
};

export async function LearnerCourseDetail({ course, outline, locale, enrollment, enrollmentError, signedIn }: Props) {
  const t = await getTranslations("courses");
  const navigationT = await getTranslations("navigation");
  const format = await getFormatter();
  const messages = getMarketingMessages(locale);
  const marketing = messages.course;
  const categories = messages.catalog.categoryNames;
  const categoryName = course.category ? categories[course.category as keyof typeof categories] ?? course.category : null;
  const level = course.level === "beginner" ? t("beginner") : course.level === "intermediate" ? t("intermediate") : course.level === "advanced" ? t("advanced") : null;
  const duration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? t("durationHm", { h: String(h), m: String(m) }) : t("durationM", { m: String(Math.max(minutes, 1)) });
  };

  const modules: ModuleGroup[] = [];
  for (const item of outline) {
    let group = modules.find((module) => module.id === item.moduleId);
    if (!group) {
      group = { id: item.moduleId, title: item.moduleTitle, meta: "", lessons: [] };
      modules.push(group);
    }
    group.lessons.push({ id: item.lessonId, title: item.lessonTitle, preview: item.isPreview, previewLabel: marketing.previewLesson });
  }
  for (const group of modules) {
    const seconds = outline.filter((item) => item.moduleId === group.id).reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
    group.meta = [t("lessonsTotal", { n: group.lessons.length }), seconds > 0 ? duration(seconds) : null].filter(Boolean).join(" · ");
  }
  const totalSeconds = outline.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0);
  const price = course.priceMinor === 0
    ? t("free")
    : format.number(course.priceMinor / 100, { style: "currency", currency: course.currency, numberingSystem: "latn", maximumFractionDigits: 0 });
  const entitled = enrollment?.status === "active" || enrollment?.status === "completed";
  const progress = entitled ? await getCourseProgress(course.id, outline.map((item) => item.lessonId)) : [];
  const resumeLesson = outline.find((item) => item.lessonId === progress[0]?.lesson_id) ?? outline[0];
  const required = outline.filter((item) => item.isRequired);
  const completedRequired = required.filter((item) => progress.some((row) => row.lesson_id === item.lessonId && row.status === 'completed')).length;
  const statusKey = { active: "statusActive", completed: "statusCompleted", revoked: "statusRevoked", expired: "statusExpired" } as const;
  const statusLabel = enrollment ? t(statusKey[enrollment.status]) : null;
  const loginHref = `/login?next=${encodeURIComponent(`/${locale}${courseHref(course.slug)}`)}`;

  const overview = (
    <>
      <h2>{t("aboutCourse")}</h2>
      <p dir="auto">{course.description || course.summary}</p>
      <div className="tags">
        {categoryName && <span>{categoryName}</span>}
        {level && <span>{level}</span>}
        <span>{price}</span>
      </div>
    </>
  );
  const curriculum = (
    <>
      <h2>{t("courseCurriculum")}</h2>
      {modules.length === 0 ? <p>{marketing.outlineEmpty}</p> : modules.map((group, index) => (
        <section key={group.id} className="module-block">
          <h3 dir="auto">{index + 1}. {group.title} <small>{group.meta}</small></h3>
          <ol>
            {group.lessons.map((lesson) => (
              <li key={lesson.id}>
                {entitled || lesson.preview
                  ? <Link href={lessonHref(course.slug, lesson.id)} dir="auto">{lesson.title}</Link>
                  : <span dir="auto">{lesson.title}</span>}
                {lesson.preview && <em className="badge">{lesson.previewLabel}</em>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );

  return (
    <div className="columns detail-columns learner-detail">
      <div className="primary">
        {entitled && <CompletionControls courseId={course.id} locale={locale} />}
        <nav className="course-breadcrumb" aria-label={navigationT("courseBreadcrumb")}>
          <Link href="/catalog">{navigationT("ourCourses")}</Link>
          <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
          <Link href="/courses">{t("allCourses")}</Link>
          <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
          <span dir="auto" aria-current="page">{course.title}</span>
        </nav>
        <div className="detail-heading">
          <span className="badge">{statusLabel ?? price}</span>
          <div className="course-title-row">
            <h1 dir="auto">{course.title}</h1>
            <CourseDetailActions slug={course.slug} />
          </div>
          <p dir="auto">{course.summary}</p>
          <div className="detail-meta">
            {level && <span><BarChart3 color="#009e70" aria-hidden="true" />{level}</span>}
            {categoryName && <span><BookOpen aria-hidden="true" />{categoryName}</span>}
            {outline.length > 0 && <span><ListChecks aria-hidden="true" />{t("lessonsTotal", { n: outline.length })}</span>}
            {totalSeconds > 0 && <span><Clock aria-hidden="true" />{duration(totalSeconds)}</span>}
            <span><Tag aria-hidden="true" />{price}</span>
          </div>
        </div>
        <div className="course-banner">
          <Image
            src={course.slug === "crash-course-odoo-erp"
              ? locale === "ar"
                ? ASSET_BASE + "odoo-erp-course-ar.png"
                : ASSET_BASE + "learner-hero.png"
              : courseImage(course.slug)}
            alt=""
            fill
            priority
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 90vw, 62vw"
          />
          {locale === "en" && course.slug === "crash-course-odoo-erp" && (
            <div className="course-banner-copy">
              <h2>
                {t("thumbnailTitle")}
                <span>{t("thumbnailHighlight")}</span>
              </h2>
              {(["thumbnailBenefit1", "thumbnailBenefit2", "thumbnailBenefit3"] as const).map((key) => (
                <p key={key}><Check aria-hidden="true" />{t(key)}</p>
              ))}
            </div>
          )}
        </div>
        <div className="instructor-row">
          <Avatar large alt={course.instructors[0] ?? marketing.instructor} />
          <div>
            <h3 dir="auto">{course.instructors.length ? course.instructors.join(", ") : marketing.instructor}</h3>
            <p>{marketing.instructor}</p>
          </div>
          <div className="detail-meta" aria-label={t("courseDetailsLabel")}>
            {totalSeconds > 0 && <span><Clock aria-hidden="true" />{duration(totalSeconds)}</span>}
            {outline.length > 0 && <span><ListChecks aria-hidden="true" />{t("lessonsTotal", { n: outline.length })}</span>}
          </div>
        </div>
        <LearnerCourseTabs tabs={[
          { id: "overview", label: t("overviewTab"), content: overview },
          { id: "curriculum", label: t("curriculumTab"), content: curriculum },
        ]} />
      </div>

      <aside className="right-rail">
        <Panel className="enroll-panel">
          <Title>{t("enrollmentTitle")}</Title>
          {enrollmentError && <p role="alert" className="enroll-note error">{marketing.enrollmentUnavailable}</p>}
          {enrollment?.status === "active" && <p role="status" className="enroll-note" data-testid="course-enrollment-active"><Check size={16} aria-hidden="true" /> {marketing.enrollmentActive}</p>}
          {enrollment?.status === "completed" && <p role="status" className="enroll-note" data-testid="course-enrollment-active"><Check size={16} aria-hidden="true" /> {marketing.enrollmentCompleted}</p>}
          {enrollment?.status === "revoked" && <p role="status" className="enroll-note">{marketing.enrollmentRevoked}</p>}
          {enrollment?.status === "expired" && <p role="status" className="enroll-note">{marketing.enrollmentExpired}</p>}
          {!enrollment && !enrollmentError && <p className="enroll-note">{t("notEnrolledYet")}</p>}
          {entitled && <p className="enroll-note">{t('completedRequired', { count: completedRequired, total: required.length })}</p>}
          {entitled && resumeLesson && (
            <Link className="btn" href={lessonHref(course.slug, resumeLesson.lessonId)} data-testid="course-start-learning">
              {t("startLearning")} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
            </Link>
          )}
          {course.priceMinor === 0 && enrollment?.status !== "active" && (
            signedIn ? (
              <form action={enrollFreeCourseAction.bind(null, course.id, locale, course.slug)}>
                <EnrollmentSubmitButton
                  className="btn"
                  label={enrollment?.status === "completed" ? marketing.enrollAgain : marketing.enrollFree}
                  pendingLabel={marketing.enrollmentSubmitting}
                  pendingAnnouncement={marketing.enrollmentSubmittingAnnouncement}
                />
              </form>
            ) : (
              <Link className="btn" href={loginHref}>{t("loginToEnroll")}</Link>
            )
          )}
          {course.priceMinor > 0 && !entitled && <p className="enroll-note">{t("paidNotice")}</p>}
        </Panel>

        <Panel>
          <Title>{t("courseCurriculum")}</Title>
          {modules.length === 0
            ? <p>{marketing.outlineEmpty}</p>
            : <CourseContentList modules={modules} expandLabel={t("expandAll")} collapseLabel={t("collapseAll")} />}
        </Panel>

        <Panel className="ai-small">
          <Title>{t("courseAi")}</Title>
          <p>{t("courseContext")}</p>
          <div className="course-ai">
            <Image src={ASSET_BASE + "ai-character.png"} alt="" width={512} height={512} />
          </div>
          <Link className="btn outline" href="/ai-page">{t("openAssistant")} <ArrowRight size={18} className="flip-rtl" aria-hidden="true" /></Link>
        </Panel>
      </aside>
    </div>
  );
}

export async function LearnerCourseUnavailable({ locale, slug, availableLocale }: { locale: Locale; slug: string; availableLocale: Locale | null }) {
  const t = await getTranslations("courses");
  const copy = getMarketingMessages(locale).course;
  return (
    <Panel>
      <div data-testid="course-unavailable">
        <Link className="text-link back-link" href="/courses"><ArrowRight size={16} className="flip-rtl back-arrow" aria-hidden="true" /> {t("backToCourses")}</Link>
        <h1>{copy.unavailableTitle}</h1>
        <p>{copy.unavailableDescription}</p>
        {availableLocale && <Link className="btn" href={courseHref(slug)} locale={availableLocale}>{availableLocale === "en" ? copy.viewInEnglish : copy.viewInArabic}</Link>}
      </div>
    </Panel>
  );
}
