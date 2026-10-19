import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { lessonHref } from "@/features/courses/components/course-links";
import { courseImage } from "@/features/courses/components/course-image";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

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
      <section className="panel assessment-shell assessment-directory">
        <h2>{t("directory")}</h2>
        {!data?.length && <p>{t("noAssessments")}</p>}
        {!!data?.length && (
          <ul>
            {data.map((lesson) => (
              <li key={lesson.lesson_id} className="assessment-heading">
                <span className="odoo-tile assessment-tile">
                  <Image src={courseImage(lesson.course_slug)} alt="" fill sizes="72px" />
                </span>
                <div>
                  <div className="eyebrow" dir="auto">{lesson.title}</div>
                  <h3 dir="auto">{lesson.course_title}</h3>
                </div>
                <Link className="btn" href={lessonHref(lesson.course_slug, lesson.lesson_id)}>
                  {t("open")}
                  <ArrowRight size={18} className="flip-rtl" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
