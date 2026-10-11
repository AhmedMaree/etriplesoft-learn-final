import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { SiteFooter } from "@/features/marketing/components/site-footer";
import { SiteHeader } from "@/features/marketing/components/site-header";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import "@/features/marketing/styles/base.css";
import "@/features/marketing/styles/shell.css";
import "@/features/marketing/styles/home.css";
import "@/features/marketing/styles/pages.css";

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = getMarketingMessages(locale);

  return (
    <div className="mk">
      <a className="mk-skip" href="#mk-main">
        {m.shell.skipToContent}
      </a>
      <SiteHeader shell={m.shell} roles={m.roles} />
      <main id="mk-main" className="mk-main">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
