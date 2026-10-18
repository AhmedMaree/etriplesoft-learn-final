import { getTranslations } from "next-intl/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { listAdminCourses } from "@/features/courses/server/course-repository";
import { CourseEditor } from "@/features/courses/components/course-editor";
import { Link } from "@/i18n/navigation";
import { AdminPager } from "@/features/admin/components/admin-pager";
import { ADMIN_PAGE_SIZE } from "@/features/admin/roles";
export default async function CourseAdministration({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("contentAdmin");
  const query = await searchParams;
  const page = /^[1-9][0-9]{0,3}$/.test(query.page ?? "")
    ? Number(query.page)
    : 1;
  const { courses, total } = await listAdminCourses(await createClient(), {
    limit: ADMIN_PAGE_SIZE,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  return (
    <>
      <h1>{t("titlePage")}</h1>
      <p>{t("descriptionPage")}</p>
      <section className="panel admin-course-list">
        <h2>{t("courses")}</h2>
        {courses.map((course) => (
          <p key={course.id}>
            <Link className="btn outline" href={`/admin/courses/${course.id}`}>
              <span dir="auto">{course.slug}</span> · {t(course.status)}
            </Link>
          </p>
        ))}
      </section>
      <AdminPager href="/admin/courses" page={page} total={total} />
      <CourseEditor />
    </>
  );
}
