import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Link } from "@/i18n/navigation";
import { IssueCertificate } from "./issue-certificate";
import { LearningStreakCard } from "@/features/learning/components/learning-streak";
import { getLearningStreak } from "@/features/calendar/server/calendar";
export async function LearnerCertificates() {
  const t = await getTranslations("realCertificates");
  const client = await createClient();
  const [issued, completed, streak] = await Promise.all([
    client.rpc("learner_list_certificates"),
    client
      .from("course_completions")
      .select("id,course_title,completed_at")
      .order("completed_at", { ascending: false })
      .limit(100),
    getLearningStreak(),
  ]);
  if (issued.error || completed.error)
    throw new Error("Certificates unavailable.");
  return (
    <div className="columns certificate-columns">
      <section className="primary">
        <div className="panel certificate-panel">
          <h2>{t("title")}</h2>
          <p>{t("description")}</p>
          {!completed.data?.length && <p>{t("empty")}</p>}
          {completed.data?.map((completion) => {
            const certificate = issued.data?.find(
              (item) => item.course_completion_id === completion.id,
            );
            return (
              <article className="completed-row" key={completion.id}>
                <div>
                  <h3 dir="auto">{completion.course_title}</h3>
                  {certificate ? (
                    <>
                      <p>
                        {t(certificate.revoked_at ? "revoked" : "valid")} ·{" "}
                        <b dir="ltr">{certificate.certificate_number}</b>
                      </p>
                      <Link
                        className="btn outline"
                        href={`/certificates/${certificate.id}`}
                      >
                        {t("view")}
                      </Link>
                    </>
                  ) : (
                    <IssueCertificate completionId={completion.id} />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {streak && (
        <aside className="right-rail">
          <LearningStreakCard streak={streak} />
        </aside>
      )}
    </div>
  );
}
