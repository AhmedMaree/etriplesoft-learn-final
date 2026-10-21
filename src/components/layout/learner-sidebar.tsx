"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  Home,
  Lock,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  ArrowRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DemoRoute } from "@/lib/routes";
import { DEMO_ONLY_ROUTES, demoFeaturesEnabled } from "@/lib/features";
import type { LearningSummary } from "@/features/learning/server/summary";
import { courseImage } from "@/features/courses/components/course-image";
import { courseHref, lessonHref } from "@/features/courses/components/course-links";
import { useQuizLock } from "@/features/assessments/quiz-lock";

type NavId = DemoRoute;

const nav: [NavId, typeof Home][] = [
  ["overview", Home],
  ["courses", BookOpen],
  ["ai-page", Sparkles],
  ["community", Users],
  ["messages", MessageSquare],
  ["calendar", CalendarDays],
  ["certificates", Award],
  ["settings", Settings],
];
const navMessage = {
  overview: "overview",
  courses: "courses",
  "ai-page": "ai",
  community: "community",
  messages: "messages",
  calendar: "calendar",
  certificates: "certificates",
  settings: "settings",
} as const;

export function LearnerSidebar({
  activePage,
  mobileOpen,
  onClose,
  continueLearning,
  isAdmin = false,
  canSchedule = false,
  hasOrganization = false,
  unreadMessages = 0,
}: {
  activePage: string;
  mobileOpen: boolean;
  onClose: () => void;
  continueLearning: LearningSummary["courses"][number] | null;
  isAdmin?: boolean;
  canSchedule?: boolean;
  hasOrganization?: boolean;
  unreadMessages?: number;
}) {
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  const quizLocked = useQuizLock();

  return (
    <>
      {mobileOpen && (
        <button
          className="scrim"
          aria-label={common("closeNavigation")}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "open" : ""} ${quizLocked ? "is-locked" : ""}`}>
        <Link className="brand" href="/" inert={quizLocked}>
          <Image
            src="/assets/logo-display.svg"
            loading="eager"
            alt="ETripleSoft Learn"
            width={871}
            height={278}
          />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label={common("closeNavigation")}
          onClick={onClose}
        >
          <X />
        </button>
        {quizLocked && (
          <p className="sidebar-lock-note" role="status">
            <Lock size={16} aria-hidden="true" />
            {t("quizLocked")}
          </p>
        )}
        <nav inert={quizLocked}>
          {nav
            .filter(([id]) => demoFeaturesEnabled || !(DEMO_ONLY_ROUTES as readonly string[]).includes(id))
            .map(([id, Icon]) => (
            <Link
              key={id}
              href={`/${id}`}
              className={activePage === id ? "active" : ""}
              onClick={onClose}
            >
              <Icon />
            <span>{t(navMessage[id as keyof typeof navMessage])}</span>
              {id === "ai-page" && <b className="badge">{t("new")}</b>}
              {id === "messages" && unreadMessages > 0 && (
                <>
                  <i className="dot" aria-hidden="true" />
                  <span className="visually-hidden">
                    {t("unreadMessages", { count: unreadMessages })}
                  </span>
                </>
              )}
            </Link>
          ))}
        </nav>
        {activePage !== "overview" && continueLearning ? (
          <ContinueLearningCard course={continueLearning} onNavigate={onClose} locked={quizLocked} />
        ) : null}
        {canSchedule && (
          <Link className="sidebar-admin-link" href="/schedule" onClick={onClose} inert={quizLocked}>
            <CalendarClock aria-hidden="true" />
            <span>{t("teachingSchedule")}</span>
          </Link>
        )}
        {hasOrganization && (
          <Link className="sidebar-admin-link" href="/organization" onClick={onClose} inert={quizLocked}>
            <Building2 aria-hidden="true" />
            <span>{t("organization")}</span>
          </Link>
        )}
        {isAdmin && (
          <Link className="sidebar-admin-link" href="/admin" onClick={onClose} inert={quizLocked}>
            <ShieldCheck aria-hidden="true" />
            <span>{t("adminDashboard")}</span>
          </Link>
        )}
      </aside>
    </>
  );
}

/** Resume card: course, real lesson progress and one clear next action. */
function ContinueLearningCard({
  course,
  onNavigate,
  locked,
}: {
  course: LearningSummary["courses"][number];
  onNavigate: () => void;
  locked: boolean;
}) {
  const t = useTranslations("navigation");
  const dashboard = useTranslations("dashboard");
  const learning = useTranslations("realLearning");
  const percent = course.required ? Math.min(100, Math.floor((course.finished / course.required) * 100)) : 0;
  const started = course.finished > 0 || percent > 0;
  const href = course.resumeLessonId ? lessonHref(course.slug, course.resumeLessonId) : courseHref(course.slug);
  return (
    <section className="continue-learning" aria-labelledby="continue-learning-title" inert={locked}>
      <div className="continue-head">
        <h2 id="continue-learning-title">{dashboard("continueTitle")}</h2>
        <span className="continue-status">{started ? dashboard("inProgress") : t("notStarted")}</span>
      </div>
      <div className="continue-course">
        <Image src={courseImage(course.slug)} alt="" width={52} height={52} />
        <div>
          <strong dir="auto" title={course.title}>{course.title}</strong>
          {course.required > 0 && (
            <small>
              <bdi>{t("lessonsProgress", { finished: course.finished, required: course.required })}</bdi>
            </small>
          )}
        </div>
      </div>
      <div className="continue-progress-row">
        <div
          className="continue-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={learning("percentComplete", { percent })}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <span className="continue-percent" dir="ltr" aria-hidden="true">{percent}%</span>
      </div>
      <Link className="continue-action" href={href} onClick={onNavigate} aria-label={`${started ? t("resumeLesson") : t("startCourse")}: ${course.title}`}>
        {started ? t("resumeLesson") : t("startCourse")}
        <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
      </Link>
    </section>
  );
}
