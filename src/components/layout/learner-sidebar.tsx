"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  Award,
  BookOpen,
  CalendarDays,
  Home,
  MessageSquare,
  Play,
  Settings,
  Sparkles,
  Users,
  X,
  GraduationCap,
} from "lucide-react";
import { IconBox } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";
import { useDemoToast } from "@/lib/browser/demo-toast";
import type { DemoRoute } from "@/lib/routes";

const nav: [DemoRoute, typeof Home][] = [
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
}: {
  activePage: string;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("navigation");
  const notify = useDemoToast();

  return (
    <>
      {mobileOpen && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <Link className="brand" href="/">
          <Image
            src="/assets/logo-display.svg"
            alt="ETripleSoft Learn"
            width={871}
            height={278}
          />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <X />
        </button>
        <nav>
          {nav.map(([id, Icon]) => (
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
        <div className="app-promo">
          <IconBox icon={GraduationCap} />
          <h3>{t("appTitle")}</h3>
          <p>{t("appCopy")}</p>
          <button
            className="store"
            onClick={() => notify("The mobile app is not available in this demo.")}
          >
            <svg viewBox="0 0 24 28" aria-hidden="true">
              <path
                fill="white"
                d="M17 0c0 3-2 5-4 5-1-3 2-5 4-5M20 15c0-4 3-5 3-5-2-4-6-4-8-3-2 1-3 1-5 0C3 5 0 11 2 18c1 4 4 9 7 9 2 0 3-1 5-1s3 1 5 1c2-1 5-6 5-8-3-1-4-3-4-4"
              />
            </svg>
            <span>
              <small>{t("downloadOn")}</small>App Store
            </span>
          </button>
          <button
            className="store"
            onClick={() => notify("The mobile app is not available in this demo.")}
          >
            <Play fill="#00d591" color="#00b7ff" />
            <span>
              <small>{t("getItOn")}</small>Google Play
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
