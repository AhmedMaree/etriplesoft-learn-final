import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { lessonHref } from "@/features/courses/components/course-links";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return createPageMetadata(params, "assessment", "/assessment");
}

export default async function AssessmentRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  await requireAuthenticatedUser(locale, `/${locale}/assessment`);
  const t = await getTranslations("realQuiz");
  const { data, error } = await (
    await createClient()
  ).rpc("learner_list_assessments", { p_locale: locale });
  if (error) throw new Error("Assessments unavailable.");
  return (
    <>
      <PageHeading
        page="assessment"
        title="Let’s keep learning!"
        subtitle="Build in-demand skills with expert-led Odoo courses and take your career to the next level."
      />
      <section className="panel assessment-shell">
        <h2>{t("directory")}</h2>
        {!data?.length && <p>{t("noAssessments")}</p>}
        {data?.map((lesson) => (
          <p key={lesson.lesson_id}>
            <Link
              className="btn outline"
              href={lessonHref(lesson.course_slug, lesson.lesson_id)}
            >
              <span dir="auto">
                {lesson.course_title} — {lesson.title}
              </span>
            </Link>
          </p>
        ))}
      </section>
    </>
  );
}
