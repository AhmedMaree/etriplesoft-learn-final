import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { listAdminCourses } from "@/features/courses/server/course-repository";
import { AdminAccessForm } from "@/features/courses/components/admin-access-form";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";

export const metadata = { robots: { index: false, follow: false } };
export default async function EnrollmentAdministration() {
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("courseAccess");
  const admin = await getTranslations("admin");
  const { courses } = await listAdminCourses(await createClient(), {
    status: "published",
    limit: 100,
  });
  return (
    <>
      <AdminPageHeader eyebrow={admin("nav.groups.learners")} title={t("title")} description={t("description")} />
      <section className="panel admin-card" aria-labelledby="admin-access-title">
        <h2 id="admin-access-title">{t("formTitle")}</h2>
        {courses.length === 0 && <p className="admin-empty">{t("noCourses")}</p>}
        <AdminAccessForm slugs={courses.map((course) => course.slug)} />
      </section>
      <aside className="admin-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>{t("auditNote")}</p>
      </aside>
    </>
  );
}
