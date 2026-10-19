import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminAccess } from "@/lib/supabase/auth";
import { isLocale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { getEditableCourse } from "@/features/courses/server/admin-content";
import { CourseEditor } from "@/features/courses/components/course-editor";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CourseStatusBadge } from "@/features/admin/components/admin-course-bits";

export const metadata = { robots: { index: false, follow: false } };

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
  const admin = await getTranslations("admin");
  const data = await getEditableCourse(courseId, locale);
  return (
    <>
      <Link className="admin-back" href="/admin/courses">
        <ArrowLeft size={16} aria-hidden="true" className="admin-flip" />
        {admin("courses.back")}
      </Link>
      <AdminPageHeader
        eyebrow={t("editCourse")}
        title={<span dir="auto">{data.course.title || data.course.slug}</span>}
        description={t("descriptionPage")}
        actions={
          <Link className="btn outline" href={`/courses?course=${data.course.slug}`}>
            <ExternalLink size={16} aria-hidden="true" />
            {t("previewCourse")}
          </Link>
        }
      >
        <p className="admin-meta-row">
          <CourseStatusBadge status={data.course.status} />
          <span className="admin-sub-inline" dir="ltr">{data.course.slug}</span>
          <span className="admin-sub-inline">{admin("courses.editingLanguage", { language: admin(`languages.${locale}`) })}</span>
        </p>
      </AdminPageHeader>
      <CourseEditor course={data.course} modules={data.modules} />
    </>
  );
}
