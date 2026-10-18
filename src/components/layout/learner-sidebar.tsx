"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  Award,
  BookOpen,
  CalendarDays,
  Compass,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DemoRoute } from "@/lib/routes";
import { DEMO_ONLY_ROUTES, demoFeaturesEnabled } from "@/lib/features";
import type { LearningSummary } from "@/features/learning/server/summary";
import { courseImage } from "@/features/courses/components/course-image";
import { courseHref, lessonHref } from "@/features/courses/components/course-links";

type NavId = DemoRoute | "catalog";

const nav: [NavId, typeof Home][] = [
  ["overview", Home],
  ["courses", BookOpen],
  ["catalog", Compass],
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
  catalog: "catalog",
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
}: {
  activePage: string;
  mobileOpen: boolean;
  onClose: () => void;
  continueLearning: LearningSummary["courses"][number] | null;
}) {
  const t = useTranslations("navigation");
  const common = useTranslations("common");
  const dashboard = useTranslations("dashboard");

  return (
    <>
      {mobileOpen && (
        <button
          className="scrim"
          aria-label={common("closeNavigation")}
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <Link className="brand" href="/">
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
        <nav>
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
              {id === "messages" && <i className="dot" />}
            </Link>
          ))}
        </nav>
        {activePage !== "overview" && continueLearning ? (
          <section className="continue-learning" aria-label={dashboard("continueTitle")}>
            <h2>{dashboard("continueTitle")}</h2>
            <Link
              className="continue-course"
              href={continueLearning.resumeLessonId
                ? lessonHref(continueLearning.slug, continueLearning.resumeLessonId)
                : courseHref(continueLearning.slug)}
              onClick={onClose}
            >
              <Image src={courseImage(continueLearning.slug)} alt="" width={48} height={48} />
              <span>{continueLearning.title}</span>
            </Link>
            <div className="continue-progress" aria-label={`${Math.floor((continueLearning.finished / Math.max(continueLearning.required, 1)) * 100)}%`}>
              <span style={{ width: `${Math.min(100, Math.floor((continueLearning.finished / Math.max(continueLearning.required, 1)) * 100))}%` }} />
            </div>
            <Link
              className="continue-action"
              href={continueLearning.resumeLessonId
                ? lessonHref(continueLearning.slug, continueLearning.resumeLessonId)
                : courseHref(continueLearning.slug)}
              onClick={onClose}
            >
              {common("continue")}
            </Link>
          </section>
        ) : null}
      </aside>
    </>
  );
}
