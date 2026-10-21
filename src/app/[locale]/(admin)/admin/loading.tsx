import { getTranslations } from "next-intl/server";

// Shown inside the admin shell while the next admin page loads, so the sidebar stays put and the click registers at once.
export default async function AdminLoading() {
  const t = await getTranslations("common");
  return (
    <div className="admin-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="admin-visually-hidden">{t("loading")}</span>
      <div aria-hidden="true">
        <div className="admin-skeleton admin-skeleton-title" />
        <div className="admin-skeleton admin-skeleton-line" />
        <div className="panel admin-card admin-skeleton-card">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="admin-skeleton admin-skeleton-row" />
          ))}
        </div>
      </div>
    </div>
  );
}
