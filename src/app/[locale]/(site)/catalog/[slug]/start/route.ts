import { notFound, redirect } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getCurrentUser } from "@/lib/supabase/auth";
import { courseHref } from "@/features/courses/components/course-links";
import { getCourseBySlug, platformSlug } from "@/features/marketing/server/course-repository";

// "Start learning" on a marketing course page: signed-in learners go to the course on the platform,
// everyone else signs in first and is returned there. Only known, published marketing courses resolve.
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const course = getCourseBySlug(slug, locale);
  if (!course || course.status !== "published") redirect(`/${locale}/catalog`);

  const coursePath = `/${locale}${courseHref(platformSlug(course))}`;
  const user = await getCurrentUser();
  redirect(user ? coursePath : `/${locale}/login?next=${encodeURIComponent(coursePath)}`);
}
