import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { getAdminAccess } from "@/lib/supabase/auth";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { StaffSchedule } from "@/features/calendar/components/staff-schedule";

export const metadata = { robots: { index: false, follow: false } };

export default async function CalendarAdministration({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const access = await getAdminAccess();
  if (access.status !== "admin") return null;
  const t = await getTranslations("courseEvents");
  const admin = await getTranslations("admin");
  return (
    <>
      <AdminPageHeader
        eyebrow={admin("nav.groups.content")}
        title={t("title")}
        description={t("description")}
      />
      <StaffSchedule locale={locale} userId={access.user.id} />
    </>
  );
}
