"use client";

import { useState, type ReactNode } from "react";
import { LearnerHeader } from "@/components/layout/learner-header";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { SiteFooter } from "@/components/layout/site-footer";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export function LearnerShell({ children, locale, displayName, avatarUrl, authenticated }: {
  children: ReactNode
  locale: Locale
  displayName: string | null
  avatarUrl: string | null
  authenticated: boolean
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = pathname.split("/").filter(Boolean).at(-1) || "overview";
  const activePage = ["detail-course", "assessment", "payment"].includes(page)
    ? "courses"
    : page;

  return (
    <div className="app-shell">
      <LearnerSidebar
        activePage={activePage}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <main className="main">
        <LearnerHeader onOpenMenu={() => setMobileOpen(true)} locale={locale} displayName={displayName} avatarUrl={avatarUrl} authenticated={authenticated} />
        {children}
        <SiteFooter />
      </main>
    </div>
  );
}
