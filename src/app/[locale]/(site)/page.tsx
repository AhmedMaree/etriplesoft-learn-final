import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { FinalCta } from "@/features/marketing/components/home/final-cta";
import { Hero } from "@/features/marketing/components/home/hero";
import { HomeFaq } from "@/features/marketing/components/home/home-faq";
import { LearningFramework } from "@/features/marketing/components/home/learning-framework";
import { LearningPaths } from "@/features/marketing/components/home/learning-paths-preview";
import { OdooModulesPreview } from "@/features/marketing/components/home/odoo-modules-preview";
import { PopularCourses } from "@/features/marketing/components/home/popular-courses";
import { TrustStrip } from "@/features/marketing/components/home/trust-strip";
import { toCourseTile } from "@/features/marketing/lib/course-tile";
import { getPathCopy, learningPaths } from "@/features/marketing/lib/learning-paths";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { getPublishedCourses } from "@/features/marketing/server/course-repository";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = getMarketingMessages(locale);
  return {
    title: m.meta.homeTitle,
    description: m.meta.homeDescription,
    alternates: { canonical: getPathname({ locale, href: "/" }) },
  };
}

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = getMarketingMessages(locale);

  const courseTiles = getPublishedCourses(locale).map((course) => toCourseTile(course, locale, m));
  const featuredPaths = learningPaths.map(({ role }) => ({ role, ...getPathCopy(m, role) }));

  return (
    <>
      <Hero />
      <TrustStrip />
      <PopularCourses courses={courseTiles} copy={m.home.courses} roles={m.roles} />
      <LearningPaths paths={featuredPaths} copy={m.home.paths} />
      <OdooModulesPreview />
      <LearningFramework />
      <HomeFaq />
      <FinalCta />
    </>
  );
}
