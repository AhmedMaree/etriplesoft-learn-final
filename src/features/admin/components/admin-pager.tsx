import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ADMIN_PAGE_SIZE } from "../roles";

export async function AdminPager({
  href,
  page,
  total,
}: {
  href: "/admin" | "/admin/audit" | "/admin/courses";
  page: number;
  total: number;
}) {
  const t = await getTranslations("admin");
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  return (
    <nav className="admin-pager" aria-label={t("pager.label")}>
      {page > 1 ? (
        <Link
          className="btn outline"
          href={{ pathname: href, query: { page: page - 1 } }}
        >
          {t("pager.previous")}
        </Link>
      ) : (
        <span />
      )}
      <span>{t("pager.status", { page, pages })}</span>
      {page < pages ? (
        <Link
          className="btn outline"
          href={{ pathname: href, query: { page: page + 1 } }}
        >
          {t("pager.next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
