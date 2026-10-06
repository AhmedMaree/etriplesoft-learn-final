"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export function useLocaleChange() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function changeLocale(targetLocale: Locale) {
    router.replace(`${pathname}${window.location.search}`, { locale: targetLocale });
  }

  return { locale, changeLocale };
}
