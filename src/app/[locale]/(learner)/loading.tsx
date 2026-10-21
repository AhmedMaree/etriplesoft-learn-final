import { getTranslations } from "next-intl/server";

// Shown inside the learner shell while the next page loads, so navigation responds at once.
export default async function LearnerLoading() {
  const t = await getTranslations("common");
  return (
    <div className="learner-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="learner-loading-label">{t("loading")}</span>
      <div aria-hidden="true">
        <div className="panel learner-skeleton learner-skeleton-hero" />
        <div className="learner-skeleton-grid">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="panel learner-skeleton learner-skeleton-card" />
          ))}
        </div>
      </div>
    </div>
  );
}
