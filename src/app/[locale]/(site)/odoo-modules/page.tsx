import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { ModuleExplorer, type ModuleView } from "@/features/marketing/components/modules/module-explorer";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { getAllModules, getCoursesForModule } from "@/features/marketing/lib/module-queries";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { modules } = getMarketingMessages(locale);
  return marketingMetadata(locale, modules.metaTitle, modules.metaDescription, "/odoo-modules");
}

export default async function OdooModulesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = getMarketingMessages(locale);
  const copy = m.modules;

  const views: ModuleView[] = getAllModules().map((mod) => ({
    slug: mod.slug,
    name: mod.name,
    shortDescription: mod.shortDescription,
    overview: mod.overview,
    icon: mod.icon,
    accent: mod.accent,
    workflow: mod.workflow,
    skills: mod.skills,
    relatedRoles: mod.relatedRoles,
    courses: getCoursesForModule(mod.slug).map((course) => ({
      slug: course.slug,
      title: course.title,
      levelLabel: m.levels[course.level],
    })),
  }));

  return (
    <>
      <section className="mk-page-hero mk-page-hero--low">
        <div className="mk-container">
          <span className="mk-kicker">{copy.eyebrow}</span>
          <h1 className="mk-page-title">{copy.title}</h1>
          <p className="mk-lead">{copy.lead}</p>
        </div>
      </section>

      <section className="mk-container mk-page-body">
        <div className="mk-center-head">
          <span className="mk-kicker">{copy.explorerEyebrow}</span>
          <h2 className="mk-h2-sm">{copy.explorerTitle}</h2>
          <p className="mk-lead">{copy.explorerLead}</p>
        </div>
        <Suspense fallback={null}>
          <ModuleExplorer modules={views} copy={copy} />
        </Suspense>
      </section>
    </>
  );
}
