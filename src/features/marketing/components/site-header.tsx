"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Menu, UserRound, X } from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { roleSlugs } from "../model/course";
import type { MarketingMessages } from "../lib/messages";
import { getOdooPartnerUrl } from "../lib/business";
import { useSignedInLearner } from "../lib/use-signed-in-learner";

type SiteHeaderProps = {
  shell: MarketingMessages["shell"];
  roles: MarketingMessages["roles"];
};

const navLinks = [
  { href: "/", key: "home" },
  { href: "/catalog", key: "courses" },
  { href: "/about", key: "about" },
] as const;

function MyLearningLink({
  label,
  avatarUrl,
  className,
  onClick,
}: {
  label: string;
  avatarUrl: string | null;
  className: string;
  onClick?: () => void;
}) {
  return (
    <Link href="/overview" className={`mk-btn mk-btn--primary mk-account ${className}`} onClick={onClick}>
      <span className="mk-account-avatar" aria-hidden="true">
        {avatarUrl ? <Image src={avatarUrl} alt="" width={28} height={28} unoptimized /> : <UserRound size={16} />}
      </span>
      {label}
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ shell, roles }: SiteHeaderProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const learner = useSignedInLearner();
  const headerRef = useRef<HTMLElement>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false);

  // The mobile drawer belongs to the page it was opened on; navigating closes it.
  const mobileOpen = menuPath === pathname;

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => header.toggleAttribute("data-scrolled", window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuPath(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMenuPath(null);
  const courseLinks = [
    { href: "/catalog", label: shell.coursesMenu.all },
    ...roleSlugs.map((role) => ({ href: `/catalog?role=${role}`, label: roles[role] })),
  ];

  return (
    <>
      <header ref={headerRef} className="mk-header">
        <div className="mk-container mk-header-inner">
          <Link href="/" className="mk-logo" aria-label={shell.homeLabel}>
            <Image src="/marketing/brand/logo-lockup.png" alt={shell.logoAlt} width={916} height={301} priority />
          </Link>

          <nav className="mk-nav" aria-label={shell.mainNavigation}>
            {navLinks.map(({ href, key }) => {
              const active = isActivePath(pathname, href);
              if (key === "courses") {
                return (
                  <div
                    key={href}
                    className="mk-nav-dropdown"
                    onMouseEnter={() => setCoursesOpen(true)}
                    onMouseLeave={() => setCoursesOpen(false)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) setCoursesOpen(false);
                    }}
                  >
                    <span className="mk-nav-link" data-active={active || undefined}>
                      <Link href={href} aria-current={active ? "page" : undefined}>
                        {shell.nav[key]}
                      </Link>
                      <button
                        type="button"
                        className="mk-nav-toggle"
                        onClick={() => setCoursesOpen((open) => !open)}
                        aria-haspopup="true"
                        aria-expanded={coursesOpen}
                        aria-label={shell.toggleCoursesMenu}
                      >
                        <ChevronDown size={16} aria-hidden="true" data-open={coursesOpen || undefined} />
                      </button>
                    </span>
                    <div className="mk-dropdown" data-open={coursesOpen || undefined}>
                      <div className="mk-dropdown-panel">
                        {courseLinks.map((item) => (
                          <Link key={item.href} href={item.href} onClick={() => setCoursesOpen(false)}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className="mk-nav-link"
                  data-active={active || undefined}
                  aria-current={active ? "page" : undefined}
                >
                  {shell.nav[key]}
                </Link>
              );
            })}
          </nav>

          <div className="mk-header-actions">
            <a
              className="mk-partner mk-header-partner"
              href={getOdooPartnerUrl(locale)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">⭐</span>
              {shell.partner}
            </a>
            <LocaleSwitcher className="mk-locale" />
            {learner ? (
              <MyLearningLink label={shell.myLearning} avatarUrl={learner.avatarUrl} className="mk-btn--sm" />
            ) : (
              <>
                <Link href="/login" className="mk-login">
                  {shell.logIn}
                </Link>
                <Link href="/sign-up" className="mk-btn mk-btn--primary mk-btn--sm">
                  {shell.signUp}
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="mk-menu-button"
            onClick={() => setMenuPath(mobileOpen ? null : pathname)}
            aria-label={mobileOpen ? shell.closeMenu : shell.openMenu}
            aria-expanded={mobileOpen}
            aria-controls="mk-mobile-menu"
          >
            {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div
        id="mk-mobile-menu"
        className="mk-drawer"
        data-open={mobileOpen || undefined}
        role="navigation"
        aria-label={shell.mobileMenu}
        inert={!mobileOpen}
      >
        <div className="mk-drawer-links">
          {navLinks.map(({ href, key }) =>
            key === "courses" ? (
              <div key={href} className="mk-drawer-group">
                <div className="mk-drawer-row">
                  <Link href={href} onClick={closeMobile}>
                    {shell.nav[key]}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileCoursesOpen((open) => !open)}
                    aria-haspopup="true"
                    aria-expanded={mobileCoursesOpen}
                    aria-label={shell.toggleCoursesMenu}
                  >
                    <ChevronDown size={20} aria-hidden="true" data-open={mobileCoursesOpen || undefined} />
                  </button>
                </div>
                <div className="mk-drawer-sub" hidden={!mobileCoursesOpen}>
                  {courseLinks.map((item) => (
                    <Link key={item.href} href={item.href} onClick={closeMobile}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={href} href={href} onClick={closeMobile}>
                {shell.nav[key]}
              </Link>
            ),
          )}
        </div>
        <div className="mk-drawer-footer">
          <a className="mk-partner" href={getOdooPartnerUrl(locale)} target="_blank" rel="noopener noreferrer">
            <span aria-hidden="true">⭐</span>
            {shell.partner}
          </a>
          <LocaleSwitcher className="mk-locale mk-locale--block" />
          {learner ? (
            <MyLearningLink
              label={shell.myLearning}
              avatarUrl={learner.avatarUrl}
              className="mk-btn--block"
              onClick={closeMobile}
            />
          ) : (
            <>
              <Link href="/login" className="mk-btn mk-btn--outline mk-btn--block" onClick={closeMobile}>
                {shell.logIn}
              </Link>
              <Link href="/sign-up" className="mk-btn mk-btn--primary mk-btn--block" onClick={closeMobile}>
                {shell.signUp}
              </Link>
            </>
          )}
        </div>
      </div>
      {mobileOpen && <div className="mk-scrim" onClick={closeMobile} aria-hidden="true" />}
    </>
  );
}
