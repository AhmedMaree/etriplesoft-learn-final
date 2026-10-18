import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { isLocale } from "@/i18n/config";
import { getEditableCourse } from "@/features/courses/server/admin-content";
import { CourseEditor } from "@/features/courses/components/course-editor";
export default async function CourseEditorPage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string }>;
}) {
  const { locale, courseId } = await params;
  if (
    !isLocale(locale) ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(courseId)
  )
    notFound();
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("contentAdmin");
  const data = await getEditableCourse(courseId, locale);
  return (
    <>
      <h1>{t("editCourse")}</h1>
      <p>{t("descriptionPage")}</p>
      <CourseEditor course={data.course} modules={data.modules} />
    </>
  );
}
