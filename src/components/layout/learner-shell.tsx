"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LearnerHeader } from "@/components/layout/learner-header";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { LearningSummary } from "@/features/learning/server/summary";

export function LearnerShell({ children, footer, locale, displayName, avatarUrl, authenticated, continueLearning }: {
  children: ReactNode
  footer: ReactNode
  locale: Locale
  displayName: string | null
  avatarUrl: string | null
  authenticated: boolean
  continueLearning: LearningSummary["courses"][number] | null
}) {
  const pathname = usePathname();
  const common = useTranslations("common");
  const [mobileOpen, setMobileOpen] = useState(false);
  const page = pathname.split("/").filter(Boolean).at(-1) || "overview";
  const activePage = ["detail-course", "assessment", "payment"].includes(page)
    ? "courses"
    : page;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#learner-main">
        {common("skipToContent")}
      </a>
      <LearnerSidebar
        activePage={activePage}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        continueLearning={continueLearning}
      />
      <main className="main" id="learner-main" tabIndex={-1}>
        <LearnerHeader onOpenMenu={() => setMobileOpen(true)} locale={locale} displayName={displayName} avatarUrl={avatarUrl} authenticated={authenticated} />
        {children}
        {footer}
      </main>
    </div>
  );
}
