import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFormatter, getTranslations } from "next-intl/server";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Verification({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) notFound();
  const { data, error } = await (
    await createClient()
  ).rpc("verify_certificate", { p_token: token });
  if (error) throw new Error("Verification unavailable.");
  const certificate = data?.[0];
  if (!certificate) notFound();
  const t = await getTranslations("realCertificates");
  const format = await getFormatter();
  return (
    <section className="mk-container certificate-verification">
      <h1>{t("verification")}</h1>
      <p>{t(certificate.status === "valid" ? "valid" : "revoked")}</p>
      <h2 dir="auto">{certificate.learner_name}</h2>
      <p dir="auto">{certificate.course_title}</p>
      <p dir="ltr">{certificate.certificate_number}</p>
      <p>
        {format.dateTime(new Date(certificate.issued_at), {
          dateStyle: "medium",
          timeZone: "Africa/Cairo",
        })}
      </p>
    </section>
  );
}
