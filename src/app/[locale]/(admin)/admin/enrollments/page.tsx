import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { listAdminCourses } from "@/features/courses/server/course-repository";
import { AdminAccessForm } from "@/features/courses/components/admin-access-form";

export const metadata = { robots: { index: false, follow: false } };
export default async function EnrollmentAdministration() {
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("courseAccess");
  const { courses } = await listAdminCourses(await createClient(), {
    status: "published",
    limit: 100,
  });
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      <AdminAccessForm slugs={courses.map((course) => course.slug)} />
    </>
  );
}
