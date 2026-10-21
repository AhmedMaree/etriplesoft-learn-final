import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

const DEFAULT_IMAGE = { url: "/marketing/brand/logo-lockup.png", width: 916, height: 301 };

/** Link-preview defaults; Next replaces `openGraph` as a whole, so pages extend this rather than set their own. */
export function siteOpenGraph(locale: Locale) {
  return {
    type: "website" as const,
    siteName: "ETripleSoft Learn",
    locale: locale === "ar" ? "ar_AR" : "en_US",
    images: [DEFAULT_IMAGE],
  };
}

export function marketingMetadata(locale: Locale, title: string, description: string, href: string, image?: string): Metadata {
  const canonical = getPathname({ locale, href });
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...siteOpenGraph(locale), title, description, url: canonical, ...(image ? { images: [image] } : {}) },
  };
}
