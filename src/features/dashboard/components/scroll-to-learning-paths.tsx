"use client";

import { Button } from "@/components/ui/primitives";
import { useTranslations } from "next-intl";

export function ScrollToLearningPaths() {
  const t = useTranslations("dashboard");
  return (
    <Button
      outline
      onClick={() =>
        document
          .getElementById("learning-paths")
          ?.scrollIntoView({ behavior: "smooth" })
      }
    >
      {t("explorePaths")}
    </Button>
  );
}
