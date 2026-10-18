"use client";
import { useState } from "react";
import { Circle, CircleCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
export function CompletionControls({
  courseId,
  locale,
  lessonId,
  lessonCompleted = false,
}: {
  courseId: string;
  locale: Locale;
  lessonId?: string;
  lessonCompleted?: boolean;
}) {
  const t = useTranslations("completion");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function complete() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/learning/completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          locale,
          ...(lessonId ? { lessonId } : {}),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error();
      if (
        data &&
        typeof data === "object" &&
        "completion" in data &&
        data.completion &&
        typeof data.completion === "object" &&
        "completed" in data.completion
      )
        setMessage(
          data.completion.completed === true
            ? "courseCompleted"
            : lessonId
              ? "lessonCompleted"
              : "moreRequired",
        );
      else throw new Error();
      router.refresh();
    } catch {
      setMessage("failed");
    } finally {
      setBusy(false);
    }
  }
  if (lessonId) {
    const Icon = lessonCompleted ? CircleCheck : Circle;
    return (
      <section className={`panel lesson-complete${lessonCompleted ? " is-done" : ""}`}>
        <span className="lesson-complete-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
        <p className="lesson-complete-text">
          {t(lessonCompleted ? "lessonCompletedHint" : "markCompleteHint")}
        </p>
        <button
          className={lessonCompleted ? "btn outline" : "btn"}
          disabled={busy || lessonCompleted}
          onClick={() => void complete()}
        >
          {t(busy ? "saving" : lessonCompleted ? "lessonCompleted" : "markComplete")}
        </button>
        {message && <p role="status">{t(message)}</p>}
      </section>
    );
  }
  return (
    <section className="panel lesson-notes course-completion-check">
      <p className="completion-hint">{t("checkCourseHint")}</p>
      <button className="btn outline" disabled={busy} onClick={() => void complete()}>
        {t(busy ? "saving" : "checkCourse")}
      </button>
      {message && <p role="status">{t(message)}</p>}
    </section>
  );
}
