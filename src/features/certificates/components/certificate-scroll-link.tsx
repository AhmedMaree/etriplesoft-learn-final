"use client";

import { Title } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

export function CertificateScrollLink() {
  const t = useTranslations("certificates");
  return (
    <Title
      link={t("allCertificates")}
      onClick={() =>
        document.getElementById("completed")?.scrollIntoView({ behavior: "smooth" })
      }
    >
      {t("myCertificate")}
    </Title>
  );
}
