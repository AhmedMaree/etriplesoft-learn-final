import { createPageMetadata } from "@/i18n/page-metadata";
import { PageHeading } from "@/components/layout/page-heading";
import { CalendarPage } from "@/features/calendar/components/calendar-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return createPageMetadata(params, "calendar", "/calendar");
}

export default function CalendarRoute() {
  return (
    <>
      <PageHeading
        page="calendar"
        title="Stay on track with your learning!"
        subtitle="View your classes, live sessions, deadlines, and important events all in one place."
      />
      <CalendarPage />
    </>
  );
}
