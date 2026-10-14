import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CertificatePreview } from "@/features/certificates/components/certificate-preview";
import { CertificatePrintActions } from "@/features/certificates/components/certificate-print-actions";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; certificateId: string }>;
}) {
  const { locale, certificateId } = await params;
  if (!isLocale(locale)) notFound();
  await requireAuthenticatedUser(locale, `/${locale}/certificates`);
  const { data, error } = await (
    await createClient()
  ).rpc("learner_list_certificates");
  if (error) throw new Error("Certificate unavailable.");
  const certificate = data?.find((item) => item.id === certificateId);
  if (!certificate) notFound();
  const t = await getTranslations("realCertificates");
  const other = locale === "en" ? "ar" : "en";
  return (
    <div className="columns certificate-columns">
      <div className="primary">
        <section className="panel certificate-panel">
          <CertificatePreview certificate={certificate} />
          <CertificatePrintActions
            verificationPath={`/${locale}/verify/${certificate.verification_token}`}
          />
          <div className="certificate-language">
            <Link href={`/certificates/${certificateId}`} locale={other}>
              {t("otherLanguage")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
