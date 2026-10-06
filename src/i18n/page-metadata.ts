import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { isLocale } from "@/i18n/config";

export async function createPageMetadata(
  params: Promise<{ locale: string }>,
  page: string,
  pathname: string,
): Promise<Metadata> {
  const { locale: requestedLocale } = await params;
  if (!isLocale(requestedLocale)) return {};
  const locale = requestedLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "pageMetadata" });

  return {
    title: t(page),
    alternates: {
      canonical: new URL(
        getPathname({ locale, href: pathname }),
        "https://learn.etriplesoft.com",
      ),
    },
  };
}
