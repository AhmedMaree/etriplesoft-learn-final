import { createPageMetadata } from "@/i18n/page-metadata";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { COURSE_SLUG_PATTERN } from "@/features/courses/server/course-repository";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "detailCourse", "/detail-course");
}

export default async function CourseDetailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slug?: string | string[] }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const slug = Array.isArray(query.slug) ? query.slug[0] : query.slug;
  if (slug && COURSE_SLUG_PATTERN.test(slug)) redirect(`/${locale}/courses?course=${slug}`);
  redirect(`/${locale}/courses`);
}
