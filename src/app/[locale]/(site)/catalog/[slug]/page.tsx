import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getPathname } from "@/i18n/navigation";
import { CourseDetail } from "@/features/marketing/components/course/course-detail";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";
import { getAllCourses, getCourseBySlug } from "@/features/marketing/server/course-repository";

const SITE_URL = "https://learn.etriplesoft.com";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCourses().map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const course = getCourseBySlug(slug, locale);
  if (!course) return { title: getMarketingMessages(locale).course.notFound };
  return marketingMetadata(locale, course.title, course.tagline, `/catalog/${course.slug}`, course.image);
}

export default async function CoursePage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const course = getCourseBySlug(slug, locale);
  if (!course) notFound();
  const url = new URL(getPathname({ locale, href: `/catalog/${course.slug}` }), SITE_URL).href;
  // Schema.org Course data for search results; editorial ratings are left out on purpose.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.tagline,
    url,
    image: new URL(course.image, SITE_URL).href,
    inLanguage: course.contentLang ?? locale,
    educationalLevel: course.level,
    provider: { "@type": "Organization", name: "ETripleSoft", sameAs: SITE_URL },
    ...(course.instructor ? { instructor: { "@type": "Person", name: course.instructor.name } } : {}),
  };
  return (
    <>
      <script
        type="application/ld+json"
        // Escaping "<" keeps editorial text from closing the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <CourseDetail course={course} locale={locale} />
    </>
  );
}
