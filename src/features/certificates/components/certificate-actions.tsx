"use client";

import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useDemoToast } from "@/lib/browser/demo-toast";
import { useTranslations } from "next-intl";

export function CertificateActions() {
  const t = useTranslations("certificates");
  const notify = useDemoToast();

  return (
    <div className="button-row">
      <Button onClick={() => window.print()}>
        <Download size={21} />
        {t("downloadAction")}
      </Button>
      <Button
        outline
        onClick={() => {
          navigator.clipboard?.writeText(location.href);
          notify(t("linkCopied"));
        }}
      >
        <Share2 size={21} />
        {t("shareAction")}
      </Button>
    </div>
  );
}
