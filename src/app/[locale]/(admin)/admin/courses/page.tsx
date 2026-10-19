import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Pencil, Plus } from "lucide-react";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/i18n/config";
import { listAdminCourses } from "@/features/courses/server/course-repository";
import { CourseEditor } from "@/features/courses/components/course-editor";
import { Link } from "@/i18n/navigation";
import { AdminPager } from "@/features/admin/components/admin-pager";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CourseLocaleChips, CourseStatusBadge } from "@/features/admin/components/admin-course-bits";
import { formatAdminDate } from "@/features/admin/format";
import { ADMIN_PAGE_SIZE } from "@/features/admin/roles";

export const metadata = { robots: { index: false, follow: false } };

const statuses = ["published", "draft", "archived"] as const;
type StatusFilter = (typeof statuses)[number];
const levels = ["beginner", "intermediate", "advanced"] as const;
type Level = (typeof levels)[number];

export default async function CourseAdministration({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("contentAdmin");
  const admin = await getTranslations("admin");
  const page = /^[1-9][0-9]{0,3}$/.test(query.page ?? "") ? Number(query.page) : 1;
  const status = statuses.find((value) => value === query.status) as StatusFilter | undefined;
  const { courses, total } = await listAdminCourses(await createClient(), {
    status,
    limit: ADMIN_PAGE_SIZE,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  const money = (minor: number, currency: string) =>
    minor === 0
      ? admin("courses.free")
      : new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { style: "currency", currency }).format(minor / 100);
  const tabs: { value: StatusFilter | undefined; label: string }[] = [
    { value: undefined, label: admin("courses.all") },
    ...statuses.map((value) => ({ value, label: admin(`courseStatus.${value}`) })),
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow={admin("nav.groups.content")}
        title={t("titlePage")}
        description={t("descriptionPage")}
        actions={
          <a className="btn" href="#new-course">
            <Plus size={18} aria-hidden="true" />
            {t("newCourse")}
          </a>
        }
      />

      <section className="panel admin-card" aria-labelledby="admin-course-list">
        <div className="admin-card-head">
          <h2 id="admin-course-list">{t("courses")}</h2>
          <span className="admin-count" dir="ltr">{total}</span>
        </div>
        <nav className="admin-tabs" aria-label={admin("courses.filter")}>
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? { pathname: "/admin/courses", query: { status: tab.value } } : "/admin/courses"}
              aria-current={tab.value === status ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        {courses.length === 0 ? (
          <p className="admin-empty">{admin("courses.empty")}</p>
        ) : (
          <div className="admin-table-wrap" tabIndex={0} role="region" aria-labelledby="admin-course-list">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{admin("courses.course")}</th>
                  <th scope="col">{admin("courses.status")}</th>
                  <th scope="col">{admin("courses.languages")}</th>
                  <th scope="col">{admin("courses.price")}</th>
                  <th scope="col">{admin("courses.updated")}</th>
                  <th scope="col"><span className="admin-visually-hidden">{admin("table.actions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <strong className="admin-ltr-strong" dir="ltr">{course.slug}</strong>
                      <span className="admin-sub">
                        {[course.category, levels.find((level) => level === course.level) ? t(course.level as Level) : course.level].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td><CourseStatusBadge status={course.status} /></td>
                    <td><CourseLocaleChips present={course.localesPresent} published={course.localesPublished} /></td>
                    <td dir="ltr" className="admin-num">{money(course.priceMinor, course.currency)}</td>
                    <td>{formatAdminDate(course.updatedAt, locale)}</td>
                    <td className="admin-cell-action">
                      <Link className="btn outline admin-btn-sm" href={`/admin/courses/${course.id}`} aria-label={`${t("editCourse")}: ${course.slug}`}>
                        <Pencil size={15} aria-hidden="true" />
                        {admin("courses.edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPager href="/admin/courses" page={page} total={total} query={status ? { status } : {}} />
      </section>

      <section className="panel admin-card admin-anchor" id="new-course" aria-labelledby="admin-new-course">
        <h2 id="admin-new-course" className="admin-visually-hidden">{t("newCourse")}</h2>
        <p className="admin-hint">{admin("courses.createHint")}</p>
        <CourseEditor />
      </section>
    </>
  );
}
