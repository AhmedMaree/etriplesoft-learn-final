import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getMarketingMessages } from "@/features/marketing/lib/messages";

// Mirrors the catalog layout so the page keeps its height (and the footer stays below) while data loads.
export default async function LearnerCoursesLoading() {
  const requestedLocale = await getLocale();
  const locale = isLocale(requestedLocale) ? requestedLocale : "en";
  return (
    <div className="columns courses-columns courses-loading" role="status" aria-live="polite" aria-busy="true">
      <p className="sr-only">{getMarketingMessages(locale).catalog.loading}</p>
      <div className="courses-main-column" aria-hidden="true">
        <div className="courses-hero skeleton-block" />
        <div className="skeleton-block skeleton-tabs" />
        <div className="course-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="panel skeleton-card">
              <div className="skeleton-block skeleton-image" />
              <div className="skeleton-block skeleton-line" />
              <div className="skeleton-block skeleton-line short" />
            </div>
          ))}
        </div>
      </div>
      <aside className="right-rail" aria-hidden="true">
        <div className="panel skeleton-block skeleton-rail" />
        <div className="panel skeleton-block skeleton-rail tall" />
      </aside>
    </div>
  );
}
