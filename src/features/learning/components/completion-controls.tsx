"use client";
import { useState } from "react";
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
  return (
    <section className="panel lesson-notes">
      <button
        className="btn outline"
        disabled={busy || (!!lessonId && lessonCompleted)}
        onClick={() => void complete()}
      >
        {t(
          busy
            ? "saving"
            : lessonId
              ? lessonCompleted
                ? "lessonCompleted"
                : "markComplete"
              : "checkCourse",
        )}
      </button>
      {message && <p role="status">{t(message)}</p>}
    </section>
  );
}
