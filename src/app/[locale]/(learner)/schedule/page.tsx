import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { StaffSchedule } from "@/features/calendar/components/staff-schedule";
import { listSchedulableCourses } from "@/features/calendar/server/staff";
import "@/features/admin/admin.css";
import "@/features/calendar/staff-schedule.css";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Instructors schedule events for the courses they are assigned to. Everyone without a schedulable
// course gets a 404; every write is re-authorized per course inside the database.
export default async function InstructorSchedule({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const user = await requireAuthenticatedUser(locale, `/${locale}/schedule`);
  const { courses } = await listSchedulableCourses(locale);
  if (!courses.length) notFound();
  const t = await getTranslations("courseEvents");
  return (
    <>
      <div className="page-heading heading-schedule">
        <h1>{t("instructorTitle")}</h1>
        <p>{t("instructorDescription")}</p>
      </div>
      <div className="admin-scope instructor-schedule">
        <StaffSchedule locale={locale} userId={user.id} />
      </div>
    </>
  );
}
