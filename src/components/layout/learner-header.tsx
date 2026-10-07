"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
} from "lucide-react";
import { Avatar } from "@/components/shared/profile-avatar";
import { featuredCourse } from "@/features/courses/data/demo-courses";
import { logoutAction } from "@/features/auth/actions";
import type { Locale } from "@/i18n/config";

export function LearnerHeader({ onOpenMenu, locale, displayName, avatarUrl, authenticated }: {
  onOpenMenu: () => void
  locale: Locale
  displayName: string | null
  avatarUrl: string | null
  authenticated: boolean
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const learnerName = displayName || t("auth.learner");
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);
  const [notification, setNotification] = useState(false);
  const page = pathname.split("/").filter(Boolean).at(-1) || "overview";

  function search(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(`/courses?q=${encodeURIComponent(query)}`);
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (pathname === "/courses") {
      const href = value ? `/courses?q=${encodeURIComponent(value)}` : "/courses";
      router.replace(href, { scroll: false });
    }
  }

  return (
    <header className="topbar">
      <button
        className="mobile-menu icon-button"
        aria-label={t("common.openNavigation")}
        onClick={onOpenMenu}
      >
        <Menu />
      </button>
      <div className="greeting">
        {["courses", "payment", "detail-course"].includes(page) ? (
          <div className="crumb">
            <Link href="/courses">{t("navigation.courses")}</Link>
            <ChevronRight size={17} />
            <span>
              {page === "payment"
                ? t("checkout.title")
                : page === "detail-course"
                  ? `All Courses  ›  ${featuredCourse.name}`
                  : "All Courses"}
            </span>
          </div>
        ) : (
          page !== "certificates" && <span>{t("dashboard.welcome")},</span>
        )}
      </div>
      <form className="search" onSubmit={search}>
        <Search size={21} />
        <input
          aria-label={t("common.search")}
          placeholder={t("common.searchCourses")}
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
        />
      </form>
      <div className="header-action">
        <button
          className="icon-button notification-button"
          aria-label={t("common.notifications")}
          onClick={() => setNotification(!notification)}
        >
          <Bell />
          <i className="dot" />
        </button>
        {notification && (
          <div className="popover">
            <strong>You’re making progress!</strong>
            <p>{t("dashboard.continueCourse")}</p>
            <button
              className="text-link"
              onClick={() => {
                router.push("/detail-course");
                setNotification(false);
              }}
            >
              {t("dashboard.continueLearning")} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="header-action">
        <button className="user-menu" onClick={() => setMenu(!menu)}>
          <Avatar src={avatarUrl} alt={learnerName} />
          <span>
            <strong>{learnerName}</strong>
            <small>{t("navigation.learning")}</small>
          </span>
          <ChevronDown size={18} />
        </button>
        {menu && (
          <div className="popover">
            <Link href="/settings" onClick={() => setMenu(false)}>
              <Settings size={16} />
              {t("navigation.settings")}
            </Link>
            {authenticated ? <form action={logoutAction.bind(null, locale)}>
              <button type="submit" onClick={() => setMenu(false)}><LogOut size={16} />{t("auth.logout")}</button>
            </form> : <Link href="/login" onClick={() => setMenu(false)}>
              {t("auth.login")}
            </Link>}
          </div>
        )}
      </div>
    </header>
  );
}
