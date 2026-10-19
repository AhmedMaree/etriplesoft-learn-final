"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { BookOpen, LifeBuoy, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  BODY_MAX,
  SUBJECT_MAX,
  type CourseOption,
  type ThreadTopic,
} from "../types";
import { startThreadAction, type MessageError } from "../server/actions";

export function NewThreadDialog({
  courses,
  initial,
  onClose,
  onStarted,
}: {
  courses: CourseOption[];
  initial: { topic: ThreadTopic; courseId: string | null };
  onClose: () => void;
  onStarted: (id: string) => void;
}) {
  const t = useTranslations("messaging");
  const common = useTranslations("common");
  const [topic, setTopic] = useState<ThreadTopic>(
    initial.topic === "course" && courses.length ? "course" : "support",
  );
  const [courseId, setCourseId] = useState(
    courses.find((c) => c.id === initial.courseId)?.id ?? courses[0]?.id ?? "",
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<MessageError | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Focus trap and Escape, matching the calendar dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current
      ?.querySelector<HTMLElement>("input:not([type=radio]), textarea")
      ?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, []);

  const course = courses.find((c) => c.id === courseId);

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await startThreadAction({
        topic,
        courseId: topic === "course" ? courseId : null,
        subject,
        body,
      });
      if ("error" in result) setError(result.error);
      else onStarted(result.id);
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-message-title"
        className="modal panel messages-dialog"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close icon-button"
          aria-label={common("close")}
          onClick={onClose}
        >
          <X />
        </button>
        <form onSubmit={submit}>
          <h2 id="new-message-title">{t("newTitle")}</h2>
          <p className="messages-dialog-copy">{t("newCopy")}</p>
          <fieldset className="messages-topics">
            <legend>{t("topicLabel")}</legend>
            <label className={topic === "course" ? "selected" : ""}>
              <input
                type="radio"
                name="topic"
                value="course"
                checked={topic === "course"}
                disabled={!courses.length}
                onChange={() => setTopic("course")}
              />
              <BookOpen size={18} aria-hidden="true" />
              <span>
                <strong>{t("topics.course")}</strong>
                <small>
                  {courses.length
                    ? t("topics.courseHint")
                    : t("topics.courseNone")}
                </small>
              </span>
            </label>
            <label className={topic === "support" ? "selected" : ""}>
              <input
                type="radio"
                name="topic"
                value="support"
                checked={topic === "support"}
                onChange={() => setTopic("support")}
              />
              <LifeBuoy size={18} aria-hidden="true" />
              <span>
                <strong>{t("topics.support")}</strong>
                <small>{t("topics.supportHint")}</small>
              </span>
            </label>
          </fieldset>
          {!courses.length && (
            <p className="messages-dialog-note">
              {t("noCoursesNote")}{" "}
              <Link href="/catalog">{t("browseCatalog")}</Link>
            </p>
          )}
          {topic === "course" && courses.length > 0 && (
            <label className="messages-field">
              <span>{t("courseLabel")}</span>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {course && course.instructors.length > 0 && (
                <small dir="auto">
                  {t("instructorsHint", {
                    names: course.instructors.join(", "),
                  })}
                </small>
              )}
            </label>
          )}
          <label className="messages-field">
            <span>{t("subjectLabel")}</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={SUBJECT_MAX}
              required
              dir="auto"
              placeholder={t("subjectPlaceholder")}
            />
          </label>
          <label className="messages-field">
            <span>{t("messageLabel")}</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={BODY_MAX}
              rows={6}
              required
              dir="auto"
              placeholder={t("messagePlaceholder")}
            />
            {body.length > BODY_MAX - 500 && (
              <small>
                {t("charactersLeft", { count: BODY_MAX - body.length })}
              </small>
            )}
          </label>
          {error && (
            <p className="messages-state error" role="alert">
              {t(`errors.${error}`)}
            </p>
          )}
          <div className="messages-dialog-actions">
            <button type="button" className="btn outline" onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="btn"
              disabled={pending || !subject.trim() || !body.trim()}
            >
              {pending ? t("sending") : t("send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
