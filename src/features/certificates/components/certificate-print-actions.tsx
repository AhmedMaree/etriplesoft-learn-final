"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
export function CertificatePrintActions({
  verificationPath,
}: {
  verificationPath: string;
}) {
  const t = useTranslations("realCertificates");
  const [status, setStatus] = useState("");
  async function share() {
    try {
      await navigator.clipboard.writeText(
        new URL(verificationPath, location.origin).href,
      );
      setStatus("copied");
    } catch {
      setStatus("copyFailed");
    }
  }
  return (
    <div className="button-row certificate-print-actions">
      <button className="btn" onClick={() => window.print()}>
        {t("printPdf")}
      </button>
      <button className="btn outline" onClick={() => void share()}>
        {t("share")}
      </button>
      {status && <p role="status">{t(status)}</p>}
    </div>
  );
}
