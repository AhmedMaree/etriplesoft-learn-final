import { getLocale, getTranslations } from "next-intl/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { QuizAuthor } from "@/features/assessments/components/quiz-author";
import { Link } from "@/i18n/navigation";
export const metadata = { robots: { index: false, follow: false } };
export default async function AssessmentAdministration() {
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("realQuiz");
  const locale = await getLocale();
  const { data, error } = await (
    await createClient()
  ).rpc("admin_list_assessment_lessons", { p_locale: locale });
  if (error) throw new Error("Assessment administration unavailable.");
  return (
    <div className="assessment-admin">
      <header className="assessment-admin-header">
        <div>
          <h1>{t("authorTitle")}</h1>
          <p>{t("authorDescription")}</p>
        </div>
        <p className="assessment-admin-locale">{t(locale === "ar" ? "arabicContent" : "englishContent")}</p>
      </header>
      {data?.length ? (
        <QuizAuthor lessons={data} />
      ) : (
        <section className="assessment-admin-empty">
          <h2>{t("noAssessmentLessonsTitle")}</h2>
          <p>{t("noAssessmentLessonsDescription")}</p>
          <Link className="btn outline" href="/admin/courses">
            {t("openCourseAdmin")}
          </Link>
        </section>
      )}
    </div>
  );
}
