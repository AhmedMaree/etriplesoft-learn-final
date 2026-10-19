import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { CourseEventForm, CourseEventTable } from "./admin-events";
import { dayKeyOf } from "../dates";
import { getLearnerTimeZone } from "../server/calendar";
import {
  listManagedCourseEvents,
  listSchedulableCourses,
} from "../server/staff";

/** Schedule form and event list, shared by the admin area and the instructor page. */
export async function StaffSchedule({
  locale,
  userId,
}: {
  locale: Locale;
  userId: string;
}) {
  const t = await getTranslations("courseEvents");
  const [{ courses, lessons }, events, timeZone] = await Promise.all([
    listSchedulableCourses(locale),
    listManagedCourseEvents(locale),
    getLearnerTimeZone(userId),
  ]);
  return (
    <>
      <section
        className="panel admin-card"
        aria-labelledby="admin-event-create"
      >
        <h2 id="admin-event-create">{t("create")}</h2>
        <CourseEventForm
          courses={courses.map((course) => ({
            id: course.id,
            slug: course.slug,
            title: course.title,
          }))}
          lessons={lessons}
          timeZone={timeZone}
          today={dayKeyOf(new Date(), timeZone)}
        />
      </section>
      <section className="panel admin-card" aria-labelledby="admin-event-list">
        <div className="admin-card-head">
          <h2 id="admin-event-list">{t("listTitle")}</h2>
          {events && (
            <span className="admin-count" dir="ltr">
              {events.length}
            </span>
          )}
        </div>
        {events ? (
          <CourseEventTable events={events} timeZone={timeZone} />
        ) : (
          <p className="admin-status error" role="alert">
            {t("errors.failed")}
          </p>
        )}
      </section>
    </>
  );
}
