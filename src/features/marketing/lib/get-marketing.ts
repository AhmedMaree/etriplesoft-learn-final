import "server-only";
import { getLocale } from "next-intl/server";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";
import { getMarketingMessages, type MarketingMessages } from "./messages";

export async function getMarketingLocale(): Promise<Locale> {
  const locale = await getLocale();
  return isLocale(locale) ? locale : defaultLocale;
}

export async function getMarketing(): Promise<{ locale: Locale; m: MarketingMessages }> {
  const locale = await getMarketingLocale();
  return { locale, m: getMarketingMessages(locale) };
}
