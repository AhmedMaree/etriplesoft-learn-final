import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  COURSE_SLUG_PATTERN,
  getCatalogCourse,
  getCatalogCourseOutline,
  getLearnerLesson,
  getCourseEnrollment,
} from "@/features/courses/server/course-repository";
import { LearnerLessonView } from "@/features/courses/components/learner-lesson";
import { getCourseProgress } from '@/features/learning/server/progress';
import { Link } from '@/i18n/navigation';
import { lessonHref } from '@/features/courses/components/course-links';
import { Panel } from '@/components/ui/primitives';

type PageProps = { params: Promise<{ locale: string; slug: string; lessonId: string }> };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const outline = course ? await getCatalogCourseOutline(client, locale, slug) : [];
  if (!course || !outline.some((item) => item.lessonId === lessonId)) {
    const otherLocale = locale === 'en' ? 'ar' : 'en';
    const otherOutline = await getCatalogCourseOutline(client, otherLocale, slug);
    if (!otherOutline.some((item) => item.lessonId === lessonId)) notFound();
    const t = await getTranslations('courses');
    return <Panel><h1>{t('lessonUnavailable')}</h1><p>{t('lessonUnavailableBody')}</p>
      <Link className="btn" href={lessonHref(slug, lessonId)} locale={otherLocale}>{t(otherLocale === 'en' ? 'openEnglishLesson' : 'openArabicLesson')}</Link></Panel>;
  }
  const lesson = await getLearnerLesson(client, lessonId, locale);
  const [enrollment, preferences, resourceResult, progress, adminAccess] = await Promise.all([
    getCourseEnrollment(client, course.id),
    client.from('learner_preferences').select('autoplay_next').maybeSingle(),
    lesson ? client.rpc('learner_get_lesson_resources', { p_lesson_id: lessonId, p_locale: locale }) : Promise.resolve({ data: [], error: null }),
    getCourseProgress(course.id, outline.map((item) => item.lessonId)),
    getAdminAccess(),
  ]);
  if (resourceResult.error) throw new Error('Lesson resources are unavailable.');
  const enrolled = enrollment?.status === 'active' || enrollment?.status === 'completed';
  const adminPreview = adminAccess.status === 'admin' && !enrolled;
  return <LearnerLessonView course={course} outline={outline} lessonId={lessonId} lesson={lesson} locale={locale}
    trackProgress={enrolled} adminPreview={adminPreview} autoplayNext={preferences.data?.autoplay_next ?? false}
    resources={resourceResult.data ?? []} progress={progress} />;
}
