import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  COURSE_SLUG_PATTERN,
  getCatalogCourse,
  getCatalogCourseOutline,
  getLearnerLesson,
} from "@/features/courses/server/course-repository";
import { LearnerLessonView } from "@/features/courses/components/learner-lesson";

type PageProps = { params: Promise<{ locale: string; slug: string; lessonId: string }> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !COURSE_SLUG_PATTERN.test(slug)) return {};
  const course = await getCatalogCourse(await createClient(), locale, slug).catch(() => null);
  return course ? { title: course.title, robots: { index: false } } : {};
}

export default async function LessonPage({ params }: PageProps) {
  const { locale, slug, lessonId } = await params;
  if (!isLocale(locale) || !COURSE_SLUG_PATTERN.test(slug) || !UUID_PATTERN.test(lessonId)) notFound();
  setRequestLocale(locale);
  await requireAuthenticatedUser(locale, `/${locale}/courses/${slug}/lessons/${lessonId}`);

  // The database decides access: the outline is the published exact-locale curriculum, and
  // learner_get_lesson returns a row only for a preview lesson or an entitled learner.
  const client = await createClient();
  const course = await getCatalogCourse(client, locale, slug);
  if (!course) notFound();
  const outline = await getCatalogCourseOutline(client, locale, slug);
  if (!outline.some((item) => item.lessonId === lessonId)) notFound();
  const lesson = await getLearnerLesson(client, lessonId, locale);

  return <LearnerLessonView course={course} outline={outline} lessonId={lessonId} lesson={lesson} locale={locale} />;
}
