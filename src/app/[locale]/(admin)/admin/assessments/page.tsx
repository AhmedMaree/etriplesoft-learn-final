import { getLocale, getTranslations } from "next-intl/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { QuizAuthor } from "@/features/assessments/components/quiz-author";
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
    <>
      <h1>{t("authorTitle")}</h1>
      <p>{t("authorDescription")}</p>
      <QuizAuthor lessons={data ?? []} />
    </>
  );
}
