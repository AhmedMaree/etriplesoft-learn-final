"use client";
import { useActionState, useState } from "react";
import {
  useFormatter,
  useTranslations,
  type DateTimeFormatOptions,
} from "next-intl";
import type { AdminActionState } from "@/features/admin/action-state";
import {
  cancelCourseEventAction,
  createCourseEventAction,
} from "../server/admin-actions";
import { COURSE_EVENT_KINDS, isDueKind, type CourseEventKind } from "../types";

export type AdminCourseEvent = {
  id: string;
  courseSlug: string;
  courseTitle: string | null;
  kind: CourseEventKind;
  startsAt: string;
  endsAt: string | null;
  meetingUrl: string | null;
  status: "scheduled" | "cancelled";
  titleEn: string | null;
  titleAr: string | null;
  learnerCount: number;
};

export function CourseEventForm({
  courses,
  lessons,
  timeZone,
  today,
}: {
  courses: { id: string; slug: string; title?: string | null }[];
  lessons: { id: string; courseSlug: string; title: string }[];
  timeZone: string;
  today: string;
}) {
  const t = useTranslations("courseEvents");
  const calendar = useTranslations("calendar");
  const [kind, setKind] = useState<CourseEventKind>("live_session");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    createCourseEventAction,
    {},
  );
  const slug = courses.find((course) => course.id === courseId)?.slug;
  const courseLessons = lessons.filter((lesson) => lesson.courseSlug === slug);
  const due = isDueKind(kind);
  if (!courses.length) return <p className="admin-empty">{t("noCourses")}</p>;
  return (
    <form action={action} className="admin-form-grid">
      <label className="admin-field" htmlFor="event-course">
        <span>{t("course")}</span>
        <select
          id="event-course"
          name="course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          dir="auto"
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title || course.slug}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field" htmlFor="event-kind">
        <span>{t("kind")}</span>
        <select
          id="event-kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as CourseEventKind)}
        >
          {COURSE_EVENT_KINDS.map((value) => (
            <option key={value} value={value}>
              {calendar(`kinds.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-field" htmlFor="event-title-en">
        <span>{t("titleEn")}</span>
        <input
          id="event-title-en"
          name="title_en"
          maxLength={160}
          dir="ltr"
          lang="en"
          aria-describedby="event-title-hint"
        />
      </label>
      <label className="admin-field" htmlFor="event-title-ar">
        <span>{t("titleAr")}</span>
        <input
          id="event-title-ar"
          name="title_ar"
          maxLength={160}
          dir="rtl"
          lang="ar"
          aria-describedby="event-title-hint"
        />
        <small id="event-title-hint" className="admin-field-hint">
          {t("titleHint")}
        </small>
      </label>
      <label className="admin-field" htmlFor="event-date">
        <span>{t("date")}</span>
        <input
          id="event-date"
          name="date"
          type="date"
          required
          min={today}
          defaultValue={today}
          dir="ltr"
        />
      </label>
      <label className="admin-field" htmlFor="event-start">
        <span>{due ? t("dueTime") : t("startTime")}</span>
        <input
          id="event-start"
          name="start"
          type="time"
          required
          defaultValue="18:00"
          dir="ltr"
          aria-describedby="event-zone-hint"
        />
        <small id="event-zone-hint" className="admin-field-hint">
          {t("zoneHint", { zone: timeZone })}
        </small>
      </label>
      {!due && (
        <label className="admin-field" htmlFor="event-end">
          <span>{t("endTime")}</span>
          <input
            id="event-end"
            name="end"
            type="time"
            defaultValue="19:00"
            dir="ltr"
          />
        </label>
      )}
      {!due && (
        <label className="admin-field" htmlFor="event-url">
          <span>{t("meetingUrl")}</span>
          <input
            id="event-url"
            name="meeting_url"
            type="url"
            inputMode="url"
            pattern="https://.+"
            maxLength={500}
            dir="ltr"
            placeholder="https://"
            aria-describedby="event-url-hint"
          />
          <small id="event-url-hint" className="admin-field-hint">
            {t("meetingUrlHint")}
          </small>
        </label>
      )}
      {due && (
        <label className="admin-field" htmlFor="event-lesson">
          <span>{t("lesson")}</span>
          <select
            id="event-lesson"
            name="lesson"
            defaultValue=""
            key={courseId}
          >
            <option value="">{t("noLesson")}</option>
            {courseLessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="admin-field" htmlFor="event-description-en">
        <span>{t("descriptionEn")}</span>
        <textarea
          id="event-description-en"
          name="description_en"
          maxLength={2000}
          rows={3}
          dir="ltr"
          lang="en"
        />
      </label>
      <label className="admin-field" htmlFor="event-description-ar">
        <span>{t("descriptionAr")}</span>
        <textarea
          id="event-description-ar"
          name="description_ar"
          maxLength={2000}
          rows={3}
          dir="rtl"
          lang="ar"
        />
      </label>
      <div className="admin-form-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t("saving") : t("createAction")}
        </button>
        <small className="admin-field-hint">{t("notifyHint")}</small>
        {state.error && (
          <p className="admin-status error" role="alert">
            {t(`errors.${state.error}`)}
          </p>
        )}
        {state.success && (
          <p className="admin-status success" role="status">
            {t(`success.${state.success}`)}
          </p>
        )}
      </div>
    </form>
  );
}

function CancelEvent({ event }: { event: AdminCourseEvent }) {
  const t = useTranslations("courseEvents");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    cancelCourseEventAction,
    {},
  );
  const name = event.titleEn ?? event.titleAr ?? event.courseSlug;
  return (
    <form
      action={action}
      className="admin-inline-form"
      onSubmit={(e) => {
        if (!window.confirm(t("cancelConfirm", { count: event.learnerCount })))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={event.id} />
      <button
        className="btn outline admin-btn-sm admin-danger"
        type="submit"
        disabled={pending}
        aria-label={`${t("cancel")}: ${name}`}
      >
        {t("cancel")}
      </button>
      {state.error && (
        <p className="admin-status error" role="alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function CourseEventTable({
  events,
  timeZone,
}: {
  events: AdminCourseEvent[];
  timeZone: string;
}) {
  const t = useTranslations("courseEvents");
  const calendar = useTranslations("calendar");
  const format = useFormatter();
  if (!events.length) return <p className="admin-empty">{t("empty")}</p>;
  const when = (iso: string, options: DateTimeFormatOptions) =>
    format.dateTime(new Date(iso), {
      timeZone,
      numberingSystem: "latn",
      ...options,
    });
  return (
    <div
      className="admin-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={t("listTitle")}
    >
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">{t("when")}</th>
            <th scope="col">{t("event")}</th>
            <th scope="col">{t("course")}</th>
            <th scope="col">{t("audience")}</th>
            <th scope="col">{t("status")}</th>
            <th scope="col">
              <span className="admin-visually-hidden">{t("actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td>
                {when(event.startsAt, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {event.endsAt && (
                  <> – {when(event.endsAt, { timeStyle: "short" })}</>
                )}
              </td>
              <td>
                <strong>{calendar(`kinds.${event.kind}`)}</strong>
                {event.titleEn && (
                  <div dir="ltr" lang="en">
                    {event.titleEn}
                  </div>
                )}
                {event.titleAr && (
                  <div dir="rtl" lang="ar">
                    {event.titleAr}
                  </div>
                )}
                {event.meetingUrl && (
                  <div className="admin-sub-inline" dir="ltr">
                    {hostOf(event.meetingUrl)}
                  </div>
                )}
              </td>
              <td>
                <span dir="auto">{event.courseTitle ?? event.courseSlug}</span>
              </td>
              <td>{t("learners", { count: event.learnerCount })}</td>
              <td>
                <span
                  className={`admin-badge ${event.status === "scheduled" ? "active" : "revoked"}`}
                >
                  {event.status === "scheduled"
                    ? t("scheduled")
                    : t("cancelled")}
                </span>
              </td>
              <td>
                {event.status === "scheduled" && <CancelEvent event={event} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
