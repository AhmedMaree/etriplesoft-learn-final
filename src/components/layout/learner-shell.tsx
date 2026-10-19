"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LearnerHeader } from "@/components/layout/learner-header";
import { LearnerSidebar } from "@/components/layout/learner-sidebar";
import { usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { LearningSummary } from "@/features/learning/server/summary";
import { AssistantLauncher } from "@/features/ai-assistant/components/assistant-launcher";

export function LearnerShell({ children, footer, locale, displayName, avatarUrl, authenticated, continueLearning, isAdmin = false, canSchedule = false, unreadNotifications = 0, unreadMessages = 0, timeZone = "UTC", assistantAvailable = false }: {
  children: ReactNode
  footer: ReactNode
  locale: Locale
  displayName: string | null
  avatarUrl: string | null
  authenticated: boolean
  continueLearning: LearningSummary["courses"][number] | null
  isAdmin?: boolean
  canSchedule?: boolean
  unreadNotifications?: number
  unreadMessages?: number
  timeZone?: string
  assistantAvailable?: boolean
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
        isAdmin={isAdmin}
        canSchedule={canSchedule}
        unreadMessages={unreadMessages}
      />
      <main className="main" id="learner-main" tabIndex={-1}>
        <LearnerHeader onOpenMenu={() => setMobileOpen(true)} locale={locale} displayName={displayName} avatarUrl={avatarUrl} authenticated={authenticated} unreadNotifications={unreadNotifications} timeZone={timeZone} />
        {children}
        {footer}
      </main>
      {/* The full assistant page already has the chat, so the floating button stays off it. */}
      {authenticated && assistantAvailable && activePage !== "ai-page" && <AssistantLauncher />}
    </div>
  );
}
