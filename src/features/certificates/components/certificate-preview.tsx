import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { ASSET_BASE } from "@/lib/assets";
import { Link } from "@/i18n/navigation";
import type { Database } from "@/types/database";
export type IssuedCertificate =
  Database["public"]["Functions"]["learner_list_certificates"]["Returns"][number];
export async function CertificatePreview({
  certificate,
}: {
  certificate: IssuedCertificate;
}) {
  const t = await getTranslations("realCertificates");
  const format = await getFormatter();
  return (
    <div className="certificate issued-certificate" id="certificate">
      <div className="certificate-top">
        <Image
          src={ASSET_BASE + "logo-display.svg"}
          alt="ETripleSoft Learn"
          width={871}
          height={278}
          style={{ height: "auto" }}
        />
        <i>{t("completionCertificate")}</i>
      </div>
      <div className="certificate-body">
        <p>{t("certify")}</p>
        <h1 dir="auto">{certificate.learner_name}</h1>
        <p>{t("completed")}</p>
        <h2 dir="auto">{certificate.course_title}</h2>
      </div>
      <div className="certificate-seal">
        <span className="ribbon" />
        <Image
          src={ASSET_BASE + "logo-display.svg"}
          alt=""
          width={871}
          height={278}
          style={{ height: "auto" }}
        />
      </div>
      <div className="certificate-bottom">
        <div>
          <small>{t("issuedOn")}</small>
          <b>
            {format.dateTime(new Date(certificate.issued_at), {
              dateStyle: "medium",
              timeZone: "Africa/Cairo",
            })}
          </b>
        </div>
        <div>
          <small>{t("number")}</small>
          <b dir="ltr">{certificate.certificate_number}</b>
        </div>
        <div>
          <Link href={`/verify/${certificate.verification_token}`}>
            {t("verify")}
          </Link>
          <small>{t(certificate.revoked_at ? "revoked" : "valid")}</small>
        </div>
      </div>
    </div>
  );
}
