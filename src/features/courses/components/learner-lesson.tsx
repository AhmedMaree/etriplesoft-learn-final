import { ArrowLeft, ArrowRight, ChevronRight, CirclePlay, Download, FileText, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { LessonPlayer } from "@/features/learning/components/lesson-player";
import { LearnerQuiz } from "@/features/assessments/components/learner-quiz";
import { QuizLockNav } from "@/features/assessments/components/quiz-lock-nav";
import { CompletionControls } from "@/features/learning/components/completion-controls";
import type { CatalogCourseDetail, CatalogOutlineLesson, LearnerLesson } from "@/features/courses/server/course-repository";
import { courseHref, lessonHref, pairedVideoChecks } from "./course-links";

type Props = {
  course: CatalogCourseDetail;
  outline: CatalogOutlineLesson[];
  lessonId: string;
  lesson: LearnerLesson | null;
  locale: Locale;
  trackProgress: boolean;
  adminPreview: boolean;
  autoplayNext: boolean;
  progress: { lesson_id: string; status: string; percent: number; updated_at: string }[];
  resources: { resource_id: string; label: string; description: string }[];
  enrolled: boolean;
  /** Lessons the database lets the caller open now (sequential learning). */
  unlocked: Set<string>;
};

/** "4:28" / "1:02:05" for a lesson row; null when the duration is not known yet. */
function clock(seconds: number | null) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export async function LearnerLessonView({ course, outline: fullOutline, lessonId, lesson, locale, trackProgress, adminPreview, autoplayNext, progress, resources, enrolled, unlocked }: Props) {
  const t = await getTranslations("courses");
  const navigationT = await getTranslations("navigation");
  const completionT = await getTranslations('completion');
  // A video's practice check is answered inside its player, so it is not listed as a separate lesson
  // (unless it is the lesson being opened directly).
  const checks = pairedVideoChecks(fullOutline);
  const checkIds = new Set(checks.values());
  const outline = fullOutline.filter((item) => !checkIds.has(item.lessonId) || item.lessonId === lessonId);
  const readingReady = !!lesson && (lesson.lessonType === 'article' ? !!lesson.body?.trim() : lesson.lessonType === 'resource' ? resources.length>0 : true);
  const index = outline.findIndex((item) => item.lessonId === lessonId);
  const current = outline[index];
  const previous = outline[index - 1] ?? null;
  const next = outline[index + 1] ?? null;
  const moduleIndex = [...new Set(outline.map((item) => item.moduleId))].indexOf(current.moduleId);
  const isCompleted = (id: string) => progress.some((row) => row.lesson_id === id && row.status === 'completed');
  // An enrolled learner without access is waiting on earlier required lessons; point them at the first one left.
  const sequenceLocked = !lesson && enrolled;
  const resumeLesson = sequenceLocked
    ? outline.find((item) => item.isRequired && unlocked.has(item.lessonId) && !isCompleted(item.lessonId)) ?? null
    : null;

  const modules: { id: string; title: string; lessons: (CatalogOutlineLesson & { number: number })[] }[] = [];
  outline.forEach((item, position) => {
    let group = modules.find((module) => module.id === item.moduleId);
    if (!group) modules.push(group = { id: item.moduleId, title: item.moduleTitle, lessons: [] });
    group.lessons.push({ ...item, number: position + 1 });
  });

  const details = (
    <>
      {lesson && !readingReady && <p className="panel lesson-notes" role="status">{completionT('contentPending')}</p>}

      {(lesson?.summary || lesson?.body) && (
        <section className="panel lesson-notes">
          <h2>{t("lessonNotes")}</h2>
          {lesson.summary && <p dir="auto">{lesson.summary}</p>}
          {lesson.body && <div dir="auto" className="lesson-body">{lesson.body}</div>}
        </section>
      )}
      {resources.length > 0 && <section className="panel lesson-resources">
        <h2>{t('resources')}</h2>
        <ul>{resources.map((resource) => <li key={resource.resource_id}>
          <a href={`/api/learning/resources/${resource.resource_id}?lessonId=${lessonId}&locale=${locale}`}>
            <span className="lesson-resource-icon" aria-hidden="true"><FileText size={20} /></span>
            <span className="lesson-resource-text">
              <strong dir="auto">{resource.label}</strong>
              {resource.description && <small dir="auto">{resource.description}</small>}
            </span>
            <Download size={18} className="lesson-resource-action" aria-hidden="true" />
          </a>
        </li>)}</ul>
      </section>}

      {trackProgress && lesson && readingReady && <CompletionControls courseId={course.id} locale={locale} {...(['article','resource'].includes(lesson.lessonType) ? {lessonId,lessonCompleted:progress.some(row=>row.lesson_id===lessonId&&row.status==='completed')} : {})} />}

      <QuizLockNav className="lesson-pager" label={t("lessonNavigation")}>
        {previous ? (
          <Link className="lesson-pager-link" href={lessonHref(course.slug, previous.lessonId)}>
            <ArrowLeft size={18} className="flip-rtl" aria-hidden="true" />
            <span>
              <small>{t("previousLesson")}</small>
              <strong dir="auto">{previous.lessonTitle}</strong>
            </span>
          </Link>
        ) : <span />}
        {next ? (
          <Link className="lesson-pager-link is-next" href={lessonHref(course.slug, next.lessonId)}>
            <span>
              <small>{t("nextLesson")}</small>
              <strong dir="auto">{next.lessonTitle}</strong>
            </span>
            <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
          </Link>
        ) : (
          <Link className="lesson-pager-link is-next" href={courseHref(course.slug)}>
            <span><strong>{t("backToCourse")}</strong></span>
            <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
          </Link>
        )}
      </QuizLockNav>
    </>
  );

  if (lesson?.lessonType === "assessment")
    return (
      <div className="assessment-page">
        {adminPreview && <p className="panel lesson-notes" role="status">{t("adminPreviewNotice")}</p>}
        <section className="panel assessment-shell">
          <QuizLockNav className="crumb" label={navigationT("courseBreadcrumb")}>
            <Link href="/courses">{t("allCourses")}</Link>
            <ChevronRight className="flip-rtl" aria-hidden="true" />
            <Link href={courseHref(course.slug)} dir="auto">{course.title}</Link>
            <ChevronRight className="flip-rtl" aria-hidden="true" />
            <span aria-current="page" dir="auto">{current.lessonTitle}</span>
          </QuizLockNav>
          <LearnerQuiz lessonId={lessonId} locale={locale} course={{ title: course.title, slug: course.slug }} />
        </section>
        {details}
      </div>
    );

  return (
    <div className="lesson-layout">
      <div className="lesson-main">
        {adminPreview && <p className="panel lesson-notes" role="status">{t("adminPreviewNotice")}</p>}
        <nav className="course-breadcrumb" aria-label={navigationT("courseBreadcrumb")}>
          <Link href="/courses">{t("allCourses")}</Link>
          <ChevronRight size={16} className="flip-rtl" aria-hidden="true" />
          <Link href={courseHref(course.slug)} dir="auto">{course.title}</Link>
        </nav>

        {lesson ? (
          lesson.lessonType === "video" && (
            <LessonPlayer
              key={lessonId}
              lessonId={lessonId}
              locale={locale}
              title={lesson.title}
              trackProgress={trackProgress}
              autoplayNext={autoplayNext}
              checkLessonId={checks.get(lessonId) ?? null}
              next={next ? { href: lessonHref(course.slug, next.lessonId), title: next.lessonTitle, isPracticeCheck: next.lessonType === "assessment" } : null}
            />
          )
        ) : (
          <div className="lesson-player lesson-player-message">
            {sequenceLocked ? (
              <div role="alert">
                <Lock size={28} aria-hidden="true" />
                <p>{t(current.lessonType === "assessment" && current.isRequired ? "assessmentSequenceLocked" : "lessonSequenceLocked")}</p>
                <Link className="btn" href={resumeLesson ? lessonHref(course.slug, resumeLesson.lessonId) : courseHref(course.slug)}>
                  {resumeLesson ? t("goToNextRequiredLesson") : t("backToCourse")}
                </Link>
              </div>
            ) : (
              <div role="alert">
                <Lock size={28} aria-hidden="true" />
                <p>{t("lessonLocked")}</p>
                <Link className="btn" href={courseHref(course.slug)}>{t("goToEnrollment")}</Link>
              </div>
            )}
          </div>
        )}

        <header className="lesson-header">
          <p className="lesson-eyebrow">
            {t("moduleLabel", { n: moduleIndex + 1 })} · <span dir="auto">{current.moduleTitle}</span>
          </p>
          <h1 dir="auto">{current.lessonTitle}</h1>
          <p className="lesson-position">{t("lessonOf", { n: index + 1, total: outline.length })}</p>
        </header>

        {details}
      </div>

      <aside className="panel lesson-sidebar" aria-label={t("courseContent")}>
        <div className="lesson-sidebar-head">
          <h2>{t("courseContent")}</h2>
          <p dir="auto">{course.title}</p>
          <div className="lesson-progress" aria-hidden="true"><span style={{ width: `${outline.filter((item) => item.isRequired && progress.some((row) => row.lesson_id === item.lessonId && row.status === 'completed')).length / Math.max(1, outline.filter((item) => item.isRequired).length) * 100}%` }} /></div>
          <small>{t("lessonOf", { n: index + 1, total: outline.length })}</small>
        </div>
        {modules.map((module, position) => (
          <section key={module.id} className="lesson-module">
            <h3><span>{t("moduleLabel", { n: position + 1 })}</span> <span dir="auto">{module.title}</span></h3>
            <ol>
              {module.lessons.map((item) => {
                const active = item.lessonId === lessonId;
                const locked = !unlocked.has(item.lessonId);
                const Icon = locked ? Lock : item.lessonType === "video" ? CirclePlay : FileText;
                return (
                  <li key={item.lessonId}>
                    <Link
                      href={lessonHref(course.slug, item.lessonId)}
                      className={[active && "active", locked && "is-locked"].filter(Boolean).join(" ") || undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={18} aria-hidden={!locked} aria-label={locked ? t("lessonLockedShort") : undefined} />
                      <span className="lesson-row-title" dir="auto">{item.number}. {item.lessonTitle}</span>
                      {isCompleted(item.lessonId) && <small>{t('lessonCompleted')}</small>}
                      {clock(item.durationSeconds) && <small>{clock(item.durationSeconds)}</small>}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </aside>
    </div>
  );
}
