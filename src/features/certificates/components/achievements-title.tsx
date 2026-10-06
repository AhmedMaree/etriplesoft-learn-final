"use client";

import { Title } from "@/components/ui/primitives";
import { useDemoToast } from "@/lib/browser/demo-toast";
import { useTranslations } from "next-intl";

export function AchievementsTitle() {
  const t = useTranslations("certificates");
  const notify = useDemoToast();
  return (
    <Title onClick={() => notify(t("achievementsShown"))}>
      {t("achievements")}
    </Title>
  );
}
