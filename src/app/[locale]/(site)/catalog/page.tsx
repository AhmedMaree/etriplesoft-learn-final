import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
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
  const courses = getAllCourses().map((course) => toCatalogCourse(course, locale, m));

  return (
    <>
      <section className="mk-page-hero mk-page-hero--grid">
        <div className="mk-container mk-catalog-hero">
          <div className="mk-page-hero-text">
            <span className="mk-kicker">{m.catalog.eyebrow}</span>
            <h1 className="mk-page-title">{m.catalog.title}</h1>
            <p className="mk-lead">{m.catalog.lead}</p>
          </div>
          <div className="mk-catalog-art">
            <Image
              src="/marketing/all-courses-image.png"
              alt={m.catalog.imageAlt}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="mk-container mk-page-body">
        <Suspense fallback={null}>
          <CourseCatalog courses={courses} copy={m.catalog} roles={m.roles} />
        </Suspense>
      </section>
    </>
  );
}
