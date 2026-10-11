import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { CourseDetail } from "@/features/marketing/components/course/course-detail";
import { getMarketingMessages } from "@/features/marketing/lib/messages";
import { marketingMetadata } from "@/features/marketing/lib/page-meta";
import { getAllCourses, getCourseBySlug } from "@/features/marketing/server/course-repository";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCourses().map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const course = getCourseBySlug(slug);
  if (!course) return { title: getMarketingMessages(locale).course.notFound };
  return marketingMetadata(locale, course.title, course.tagline, `/catalog/${course.slug}`);
}

export default async function CoursePage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const course = getCourseBySlug(slug);
  if (!course) notFound();
  return <CourseDetail course={course} locale={locale} />;
}
