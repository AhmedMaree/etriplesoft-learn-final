import { getTranslations } from "next-intl/server";
import { Panel, Title, Progress } from "@/components/ui/primitives";
import { Link } from "@/i18n/navigation";
import type { LearningSummary } from "../server/summary";
import {
  courseHref,
  lessonHref,
} from "@/features/courses/components/course-links";
export async function LearningSummaryPanel({
  summary,
}: {
  summary: LearningSummary;
}) {
  const t = await getTranslations("realLearning");
  const required = summary.courses.reduce((n, c) => n + c.required, 0);
  const finished = summary.courses.reduce((n, c) => n + c.finished, 0);
  const percent = required ? Math.floor((finished / required) * 100) : 0;
  return (
    <>
      <Panel>
        <Title href="/certificates">{t("progress")}</Title>
        <div className="progress-summary">
          <div className="ring">
            <strong>{percent}%</strong>
          </div>
          <div>
            <h3>{t("keepGoing")}</h3>
            <p>{t("lessons", { finished, required })}</p>
          </div>
        </div>
        <Progress value={percent} />
        <dl className="learning-metrics">
          <div>
            <dt>{t("enrolled")}</dt>
            <dd>{summary.enrolledCourses}</dd>
          </div>
          <div>
            <dt>{t("completed")}</dt>
            <dd>{summary.completedCourses}</dd>
          </div>
          <div>
            <dt>{t("passed")}</dt>
            <dd>{summary.passedAssessments}</dd>
          </div>
          <div>
            <dt>{t("certificates")}</dt>
            <dd>{summary.certificates}</dd>
          </div>
        </dl>
      </Panel>
      <Panel>
        <Title href="/courses?view=mine">{t("continue")}</Title>
        {!summary.courses.length && <p>{t("empty")}</p>}
        {summary.courses.slice(0, 5).map((course) => (
          <Link
            className="lesson-preview"
            key={course.slug}
            href={
              course.resumeLessonId
                ? lessonHref(course.slug, course.resumeLessonId)
                : courseHref(course.slug)
            }
          >
            <div>
              <strong dir="auto">{course.title}</strong>
              <p>
                {t("lessons", {
                  finished: course.finished,
                  required: course.required,
                })}
              </p>
              <Progress
                value={
                  course.required
                    ? (course.finished / course.required) * 100
                    : 0
                }
              />
            </div>
          </Link>
        ))}
      </Panel>
    </>
  );
}
