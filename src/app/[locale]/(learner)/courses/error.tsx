"use client";

import { useLocale } from "next-intl";
import type { Locale } from "@/i18n/config";
import { getMarketingMessages } from "@/features/marketing/lib/messages";

export default function LearnerCoursesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const copy = getMarketingMessages(useLocale() as Locale).catalog;
  return <section role="alert"><p>{copy.searchError}</p><button className="btn outline" onClick={reset}>{copy.retry}</button></section>;
}
