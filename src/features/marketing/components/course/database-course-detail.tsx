import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import type {
  CatalogCourseDetail,
  CatalogOutlineLesson,
  CourseEnrollment,
} from "@/features/courses/server/course-repository";
import {
  formatMessage,
  getMarketingMessages,
} from "@/features/marketing/lib/messages";
import { enrollFreeCourseAction } from "@/features/courses/server/enrollment-actions";
import { EnrollmentSubmitButton } from "./enrollment-submit-button";
import { getTranslations } from "next-intl/server";

const FALLBACK_IMAGE = "/marketing/all-courses-image.png";

export async function DatabaseCourseDetail({
  course,
  outline,
  locale,
  enrollment,
  enrollmentError,
}: {
  course: CatalogCourseDetail;
  outline: CatalogOutlineLesson[];
  locale: Locale;
  enrollment: CourseEnrollment | null;
  enrollmentError: boolean;
}) {
  const copy = getMarketingMessages(locale).course;
  const checkout = await getTranslations("realCheckout");

  return (
    <>
      <section className="mk-page-hero mk-page-hero--grid mk-course-hero">
        <div className="mk-container mk-course-hero-grid">
          <div>
            <div className="mk-course-kicker">
              <span className="mk-status">{copy.available}</span>
            </div>
            <h1 className="mk-page-title">{course.title}</h1>
            <p className="mk-lead">{course.summary}</p>
            {enrollmentError && (
              <p className="mk-body" role="alert">
                {copy.enrollmentUnavailable}
              </p>
            )}
            {course.priceMinor > 0 &&
              enrollment?.status !== "active" &&
              enrollment?.status !== "completed" && (
                <Link
                  className="mk-btn mk-btn-primary"
                  href={`/payment?course=${encodeURIComponent(course.slug)}`}
                >
                  {checkout("review")}
                </Link>
              )}
            {enrollment &&
              (enrollment.status === "active" ||
                enrollment.status === "completed") && (
                <p
                  className="mk-status"
                  role="status"
                  data-testid="course-enrollment-active"
                >
                  {enrollment.status === "completed"
                    ? copy.enrollmentCompleted
                    : copy.enrollmentActive}
                </p>
              )}
            {enrollment &&
              (enrollment.status === "revoked" ||
                enrollment.status === "expired") && (
                <p className="mk-body" role="status">
                  {enrollment.status === "revoked"
                    ? copy.enrollmentRevoked
                    : copy.enrollmentExpired}
                </p>
              )}
            {course.priceMinor === 0 &&
              (!enrollment || enrollment.status !== "active") && (
                <form
                  action={enrollFreeCourseAction.bind(
                    null,
                    course.id,
                    locale,
                    course.slug,
                  )}
                >
                  <EnrollmentSubmitButton
                    label={
                      enrollment?.status === "completed"
                        ? copy.enrollAgain
                        : copy.enrollFree
                    }
                    pendingLabel={copy.enrollmentSubmitting}
                    pendingAnnouncement={copy.enrollmentSubmittingAnnouncement}
                  />
                </form>
              )}
            {course.instructors.length > 0 && (
              <dl className="mk-course-facts">
                <div>
                  <dt>{copy.instructor}</dt>
                  <dd>
                    <bdi dir="auto">{course.instructors.join(", ")}</bdi>
                  </dd>
                </div>
              </dl>
            )}
          </div>
          <div className="mk-course-image">
            <Image
              src={FALLBACK_IMAGE}
              alt={formatMessage(locale, copy.thumbnailAlt, {
                title: course.title,
              })}
              fill
              loading="eager"
              sizes="(max-width: 1023px) 100vw, 40vw"
            />
          </div>
        </div>
      </section>
      {course.description && (
        <section className="mk-container mk-page-body">
          <div className="mk-course-main">
            <div>
              <h2 className="mk-h2-sm">{copy.overview}</h2>
              <div className="mk-prose">
                <p>{course.description}</p>
              </div>
            </div>
          </div>
        </section>
      )}
      <section className="mk-container mk-page-body">
        <div className="mk-course-main">
          <div>
            <h2 className="mk-h2-sm">{copy.outlineTitle}</h2>
            {outline.length === 0 ? (
              <p className="mk-body">{copy.outlineEmpty}</p>
            ) : (
              Array.from(
                new Map(outline.map((item) => [item.moduleId, item])).values(),
              ).map((module) => (
                <section className="mk-panel" key={module.moduleId}>
                  <h3 className="mk-h2-sm">{module.moduleTitle}</h3>
                  {module.moduleDescription && (
                    <p className="mk-body">{module.moduleDescription}</p>
                  )}
                  <ol>
                    {outline
                      .filter((item) => item.moduleId === module.moduleId)
                      .map((lesson) => (
                        <li key={lesson.lessonId}>
                          <strong>{lesson.lessonTitle}</strong>
                          {lesson.isPreview && (
                            <span className="mk-status">
                              {copy.previewLesson}
                            </span>
                          )}
                          {lesson.lessonSummary && (
                            <p className="mk-body">{lesson.lessonSummary}</p>
                          )}
                        </li>
                      ))}
                  </ol>
                </section>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function UnavailableDatabaseCourse({
  locale,
  slug,
  availableLocale,
}: {
  locale: Locale;
  slug: string;
  availableLocale: Locale | null;
}) {
  const copy = getMarketingMessages(locale).course;
  const alternateLabel =
    availableLocale === "en" ? copy.viewInEnglish : copy.viewInArabic;

  return (
    <section className="mk-page-hero">
      <div
        className="mk-container mk-page-hero-text"
        data-testid="course-unavailable"
      >
        <h1 className="mk-page-title">{copy.unavailableTitle}</h1>
        <p className="mk-lead">{copy.unavailableDescription}</p>
        {availableLocale && (
          <Link
            className="mk-link-arrow"
            href={`/catalog/${slug}`}
            locale={availableLocale}
          >
            {alternateLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
