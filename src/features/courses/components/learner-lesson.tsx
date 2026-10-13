import { ArrowLeft, ArrowRight, ChevronRight, CirclePlay, FileText, Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { LessonPlayer } from "@/features/learning/components/lesson-player";
import type { CatalogCourseDetail, CatalogOutlineLesson, LearnerLesson } from "@/features/courses/server/course-repository";
import { courseHref, lessonHref } from "./course-links";

type Props = {
  course: CatalogCourseDetail;
  outline: CatalogOutlineLesson[];
  lessonId: string;
  lesson: LearnerLesson | null;
  locale: Locale;
};

/** "4:28" / "1:02:05" for a lesson row; null when the duration is not known yet. */
function clock(seconds: number | null) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export async function LearnerLessonView({ course, outline, lessonId, lesson, locale }: Props) {
  const t = await getTranslations("courses");
  const navigationT = await getTranslations("navigation");
  const index = outline.findIndex((item) => item.lessonId === lessonId);
  const current = outline[index];
  const previous = outline[index - 1] ?? null;
  const next = outline[index + 1] ?? null;
  const moduleIndex = [...new Set(outline.map((item) => item.moduleId))].indexOf(current.moduleId);

  const modules: { id: string; title: string; lessons: (CatalogOutlineLesson & { number: number })[] }[] = [];
  outline.forEach((item, position) => {
    let group = modules.find((module) => module.id === item.moduleId);
    if (!group) modules.push(group = { id: item.moduleId, title: item.moduleTitle, lessons: [] });
    group.lessons.push({ ...item, number: position + 1 });
  });

  return (
    <div className="lesson-layout">
      <div className="lesson-main">
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
              next={next ? { href: lessonHref(course.slug, next.lessonId), title: next.lessonTitle } : null}
            />
          )
        ) : (
          <div className="lesson-player lesson-player-message">
            <div role="alert">
              <Lock size={28} aria-hidden="true" />
              <p>{t("lessonLocked")}</p>
              <Link className="btn" href={courseHref(course.slug)}>{t("goToEnrollment")}</Link>
            </div>
          </div>
        )}

        <header className="lesson-header">
          <p className="lesson-eyebrow">
            {t("moduleLabel", { n: moduleIndex + 1 })} · <span dir="auto">{current.moduleTitle}</span>
          </p>
          <h1 dir="auto">{current.lessonTitle}</h1>
          <p className="lesson-position">{t("lessonOf", { n: index + 1, total: outline.length })}</p>
        </header>

        <nav className="lesson-pager" aria-label={t("lessonNavigation")}>
          {previous ? (
            <Link className="btn outline" href={lessonHref(course.slug, previous.lessonId)}>
              <ArrowLeft size={16} className="flip-rtl" aria-hidden="true" /> {t("previousLesson")}
            </Link>
          ) : <span />}
          {next ? (
            <Link className="btn" href={lessonHref(course.slug, next.lessonId)}>
              {t("nextLesson")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
            </Link>
          ) : (
            <Link className="btn outline" href={courseHref(course.slug)}>{t("backToCourse")}</Link>
          )}
        </nav>

        {(lesson?.summary || lesson?.body) && (
          <section className="panel lesson-notes">
            <h2>{t("lessonNotes")}</h2>
            {lesson.summary && <p dir="auto">{lesson.summary}</p>}
            {lesson.body && <div dir="auto" className="lesson-body">{lesson.body}</div>}
          </section>
        )}
      </div>

      <aside className="panel lesson-sidebar" aria-label={t("courseContent")}>
        <div className="lesson-sidebar-head">
          <h2>{t("courseContent")}</h2>
          <p dir="auto">{course.title}</p>
          <div className="lesson-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / outline.length) * 100}%` }} /></div>
          <small>{t("lessonOf", { n: index + 1, total: outline.length })}</small>
        </div>
        {modules.map((module, position) => (
          <section key={module.id} className="lesson-module">
            <h3><span>{t("moduleLabel", { n: position + 1 })}</span> <span dir="auto">{module.title}</span></h3>
            <ol>
              {module.lessons.map((item) => {
                const active = item.lessonId === lessonId;
                const Icon = item.lessonType === "video" ? CirclePlay : FileText;
                return (
                  <li key={item.lessonId}>
                    <Link
                      href={lessonHref(course.slug, item.lessonId)}
                      className={active ? "active" : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="lesson-row-title" dir="auto">{item.number}. {item.lessonTitle}</span>
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
