"use client";

import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { useLocaleChange } from "@/i18n/use-locale-change";

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, changeLocale } = useLocaleChange();
  const targetLocale = locale === "en" ? "ar" : "en";
  const t = useTranslations("common");

  return (
    <button
      type="button"
      className={className}
      aria-label={`${t("switchLanguage")}: ${targetLocale === "ar" ? t("arabic") : t("english")}`}
      onClick={() => changeLocale(targetLocale)}
    >
      <Globe size={17} />
      {targetLocale === "ar" ? t("arabic") : t("english")}
    </button>
  );
}
