import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Award, BookOpen, ChartColumn, CircleCheck, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ASSET_BASE } from "@/lib/assets";
import type { LearningSummary } from "../server/summary";
import { courseImage } from "@/features/courses/components/course-image";
import {
  courseHref,
  lessonHref,
} from "@/features/courses/components/course-links";

const RING_RADIUS = 50;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** Shared right-rail card header: accent, title, subtitle and an optional "View all" link. */
export async function RailHead({ id, title, subtitle, href, accent = "blue" }: { id: string; title: string; subtitle: string; href?: string; accent?: "blue" | "orange" }) {
  const common = await getTranslations("common");
  return (
    <header className="rl-head">
      <div>
        <span className={`rl-accent ${accent}`} aria-hidden="true" />
        <h2 id={id}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {href && (
        <Link className="rl-more" href={href}>
          {common("viewAll")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}

function Stat({ tone, icon: Icon, value, label, href }: { tone: string; icon: LucideIcon; value: number; label: string; href: string }) {
  return (
    <Link className={`rl-stat ${tone}`} href={href}>
      <span className="rl-stat-icon" aria-hidden="true"><Icon /></span>
      <strong>{value}</strong>
      <span className="rl-stat-label">{label}</span>
      <span className="rl-stat-go" aria-hidden="true"><ArrowRight size={14} className="flip-rtl" /></span>
    </Link>
  );
}

function percentOf(finished: number, required: number) {
  return required ? Math.min(100, Math.floor((finished / required) * 100)) : 0;
}

export async function LearningSummaryPanel({
  summary,
}: {
  summary: LearningSummary;
}) {
  const t = await getTranslations("realLearning");
  const dashboard = await getTranslations("dashboard");
  const courses = await getTranslations("courses");
  const required = summary.courses.reduce((n, c) => n + c.required, 0);
  const finished = summary.courses.reduce((n, c) => n + c.finished, 0);
  const percent = percentOf(finished, required);
  const message = percent >= 100 ? t("progressDone") : percent > 0 ? t("progressMiddle") : t("progressStart");
  const stats: { tone: string; icon: LucideIcon; value: number; label: string; href: string }[] = [
    { tone: "blue", icon: BookOpen, value: summary.enrolledCourses, label: t("enrolled"), href: "/courses?view=mine" },
    { tone: "green", icon: CircleCheck, value: summary.completedCourses, label: t("completed"), href: "/courses?view=mine" },
    { tone: "orange", icon: ChartColumn, value: summary.passedAssessments, label: t("passed"), href: "/assessment" },
    { tone: "purple", icon: Award, value: summary.certificates, label: t("certificates"), href: "/certificates" },
  ];
  return (
    <>
      <section className="rl-card rl-progress" aria-labelledby="rl-progress-title">
        <RailHead id="rl-progress-title" title={t("progress")} subtitle={t("progressSubtitle")} href="/certificates" />
        <div className="rl-summary">
          <div
            className="rl-ring"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={t("percentComplete", { percent })}
          >
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="rl-ring-track" cx="60" cy="60" r={RING_RADIUS} />
              {percent > 0 && (
                <circle
                  className="rl-ring-value"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  strokeDasharray={`${(percent / 100) * RING_LENGTH} ${RING_LENGTH}`}
                />
              )}
            </svg>
            <span aria-hidden="true">
              <strong dir="ltr">{percent}%</strong>
              <small>{t("complete")}</small>
            </span>
          </div>
          <div className="rl-motivation">
            <div className="rl-motivation-top">
              <span className="rl-pill"><GraduationCap size={14} aria-hidden="true" />{t("keepLearning")}</span>
              <Image className="rl-art" src={ASSET_BASE + "progress-books-art.png"} alt="" aria-hidden="true" width={360} height={303} sizes="96px" />
            </div>
            <h3>{message}</h3>
            <p><bdi>{t("lessons", { finished, required })}</bdi></p>
          </div>
        </div>
        <ul className="rl-stats">
          {stats.map((stat) => <li key={stat.tone}><Stat {...stat} /></li>)}
        </ul>
      </section>
      <section className="rl-card rl-continue" aria-labelledby="rl-continue-title">
        <RailHead id="rl-continue-title" title={t("continue")} subtitle={t("continueSubtitle")} href="/courses?view=mine" />
        {!summary.courses.length && (
          <div className="rl-empty">
            <p>{t("empty")}</p>
            <Link className="btn rl-btn" href="/courses">
              {dashboard("browseCourses")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
            </Link>
          </div>
        )}
        <ul className="rl-courses">
          {summary.courses.slice(0, 3).map((course) => {
            const coursePercent = percentOf(course.finished, course.required);
            const done = course.status === "completed";
            return (
              <li className="rl-course" key={course.slug}>
                <div className="rl-course-thumb">
                  <Image src={courseImage(course.slug)} alt="" fill sizes="96px" />
                </div>
                <div className="rl-course-body">
                  <span className={`rl-status ${done ? "done" : ""}`}>{done ? courses("statusCompleted") : dashboard("inProgress")}</span>
                  <h3 dir="auto">{course.title}</h3>
                  <p><bdi>{t("lessons", { finished: course.finished, required: course.required })}</bdi></p>
                </div>
                <div className="rl-course-bar">
                  <div className="rl-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={coursePercent} aria-label={t("percentComplete", { percent: coursePercent })}>
                    <span style={{ width: `${coursePercent}%` }} />
                  </div>
                  <span className="rl-percent" dir="ltr">{coursePercent}%</span>
                </div>
                <Link
                  className="btn rl-btn"
                  href={course.resumeLessonId ? lessonHref(course.slug, course.resumeLessonId) : courseHref(course.slug)}
                  aria-label={`${t("continue")}: ${course.title}`}
                >
                  {t("continue")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** Quick links card; each link keeps its existing destination. */
export async function QuickLinksCard({ links }: { links: { href: string; icon: LucideIcon; title: string; subtitle: string; tone: string }[] }) {
  const t = await getTranslations("realLearning");
  const dashboard = await getTranslations("dashboard");
  return (
    <section className="rl-card rl-quick" aria-labelledby="rl-quick-title">
      <Image className="rl-quick-art" src={ASSET_BASE + "certificate-award-art.png"} alt="" aria-hidden="true" width={360} height={335} sizes="96px" />
      <RailHead id="rl-quick-title" title={dashboard("quickLinks")} subtitle={t("quickSubtitle")} accent="orange" />
      <ul className="rl-links">
        {links.map(({ href, icon: Icon, title, subtitle, tone }) => (
          <li key={href}>
            <Link className={`rl-link ${tone}`} href={href}>
              <span className="rl-link-icon" aria-hidden="true"><Icon /></span>
              <span className="rl-link-text">
                <strong>{title}</strong>
                <small>{subtitle}</small>
              </span>
              <ArrowRight size={16} className="flip-rtl rl-link-go" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type QuickLink = Parameters<typeof QuickLinksCard>[0]["links"][number];
