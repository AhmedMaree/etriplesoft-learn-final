"use client";

import { useState, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
} from "lucide-react";
import { Avatar } from "@/components/shared/profile-avatar";
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
            <Link href="/courses">{t("navigation.ourCourses")}</Link>
            <ChevronRight size={17} className="flip-rtl" aria-hidden="true" />
            <span>
              {page === "payment" ? t("checkout.title") : t("courses.allCourses")}
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
        </button>
        {notification && (
          <div className="popover">
            <strong>{t("common.notifications")}</strong>
            <p>{t("common.noNotifications")}</p>
          </div>
        )}
      </div>
      <div className="header-action">
        <button className="user-menu" onClick={() => setMenu(!menu)}>
          <Avatar src={avatarUrl} alt={learnerName} />
          <span>
            <strong>{learnerName}</strong>
            <small>{t("navigation.learner")}</small>
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
              <button type="submit"><LogOut size={16} />{t("auth.logout")}</button>
            </form> : <Link href="/login" onClick={() => setMenu(false)}>
              {t("auth.login")}
            </Link>}
          </div>
        )}
      </div>
    </header>
  );
}
