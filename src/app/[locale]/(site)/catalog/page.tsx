import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { CatalogHero } from "@/features/marketing/components/catalog/catalog-hero";
import { CourseCatalog } from "@/features/marketing/components/catalog/course-catalog";
import { toCatalogCourse } from "@/features/marketing/lib/catalog-data";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";
import { getAllCourses } from "@/features/marketing/server/course-repository";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const { catalog } = getMarketingMessages(locale);
  return marketingMetadata(locale, catalog.metaTitle, catalog.metaDescription, "/catalog");
}

export default async function CatalogPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const m = getMarketingMessages(locale);
  const courses = getAllCourses(locale).map((course) => toCatalogCourse(course, locale, m));

  return (
    <>
      <CatalogHero locale={locale} copy={m.catalog} courseCount={courses.length} />

      <section id="courses" className="mk-container mk-page-body mk-anchor">
        <Suspense fallback={null}>
          <CourseCatalog courses={courses} copy={m.catalog} roles={m.roles} />
        </Suspense>
      </section>
    </>
  );
}
