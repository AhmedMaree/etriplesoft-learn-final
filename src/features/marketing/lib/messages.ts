import { createTranslator } from "next-intl";
import type { Locale } from "@/i18n/config";
import ar from "../../../../messages/marketing/ar.json";
import en from "../../../../messages/marketing/en.json";
import pagesAr from "../../../../messages/marketing/pages-ar.json";
import pagesEn from "../../../../messages/marketing/pages-en.json";

/** Shape of the public-site copy; `ar` must satisfy it, so the locales cannot drift apart. */
export type MarketingMessages = typeof en & typeof pagesEn;

const catalogs: Record<Locale, MarketingMessages> = {
  en: { ...en, ...pagesEn },
  ar: { ...ar, ...pagesAr },
};

export function getMarketingMessages(locale: Locale): MarketingMessages {
  return catalogs[locale];
}

/**
 * Fills ICU placeholders/plurals in a message. Numbers meant for display are passed as
 * strings so Arabic keeps Western digits (see docs/I18N.md); plural selectors take numbers.
 */
export function formatMessage(
  locale: Locale,
  message: string,
  values: Record<string, string | number> = {},
): string {
  return createTranslator({ locale, messages: { message } })("message", values);
}
