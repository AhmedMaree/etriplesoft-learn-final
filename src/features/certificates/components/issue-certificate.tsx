"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
export function IssueCertificate({ completionId }: { completionId: string }) {
  const t = useTranslations("realCertificates");
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function issue() {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch("/api/learning/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completionId, locale }),
      });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="btn" disabled={busy} onClick={() => void issue()}>
        {t(busy ? "saving" : "issue")}
      </button>
      {error && <p role="alert">{t("failed")}</p>}
    </div>
  );
}
