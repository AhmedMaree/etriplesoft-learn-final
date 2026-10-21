import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ADMIN_PAGE_SIZE } from "../roles";

export async function AdminPager({
  href,
  page,
  total,
  query = {},
}: {
  href: "/admin/roles" | "/admin/audit" | "/admin/courses" | "/admin/analytics/learners";
  page: number;
  total: number;
  // Filters to keep while paging (e.g. the course status tab).
  query?: Record<string, string>;
}) {
  const t = await getTranslations("admin");
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  if (total === 0) return null;
  const first = (page - 1) * ADMIN_PAGE_SIZE + 1;
  const last = Math.min(total, page * ADMIN_PAGE_SIZE);
  return (
    <nav className="admin-pager" aria-label={t("pager.label")}>
      <span className="admin-pager-range">{t("pager.range", { first, last, total })}</span>
      <span className="admin-pager-controls">
        {page > 1 ? (
          <Link className="btn outline" href={{ pathname: href, query: { ...query, page: page - 1 } }}>
            <ChevronLeft size={16} aria-hidden="true" className="admin-flip" />
            {t("pager.previous")}
          </Link>
        ) : (
          <span className="btn outline" aria-disabled="true">
            <ChevronLeft size={16} aria-hidden="true" className="admin-flip" />
            {t("pager.previous")}
          </span>
        )}
        <span className="admin-pager-status">{t("pager.status", { page, pages })}</span>
        {page < pages ? (
          <Link className="btn outline" href={{ pathname: href, query: { ...query, page: page + 1 } }}>
            {t("pager.next")}
            <ChevronRight size={16} aria-hidden="true" className="admin-flip" />
          </Link>
        ) : (
          <span className="btn outline" aria-disabled="true">
            {t("pager.next")}
            <ChevronRight size={16} aria-hidden="true" className="admin-flip" />
          </span>
        )}
      </span>
    </nav>
  );
}
