import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

export function marketingMetadata(locale: Locale, title: string, description: string, href: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: getPathname({ locale, href }) },
  };
}
