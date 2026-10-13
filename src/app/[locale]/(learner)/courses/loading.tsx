import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getMarketingMessages } from "@/features/marketing/lib/messages";

export default async function LearnerCoursesLoading() {
  const requestedLocale = await getLocale();
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  return <section role="status" aria-live="polite" aria-busy="true">{getMarketingMessages(locale).catalog.loading}</section>;
}
