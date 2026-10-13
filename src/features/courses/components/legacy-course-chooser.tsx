import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getMarketingMessages } from "@/features/marketing/lib/messages";

export function LegacyCourseChooser({ locale }: { locale: Locale }) {
  const copy = getMarketingMessages(locale).catalog;
  return (
    <section className="panel">
      <h2>{copy.legacyTitle}</h2>
      <p>{copy.legacyDescription}</p>
      <Link className="btn" href="/courses">{copy.browseCourses}</Link>
    </section>
  );
}
