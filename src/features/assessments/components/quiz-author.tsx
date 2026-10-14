"use client";
import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DraftTranslation } from "./draft-translation";

type Question = {
  type: "single" | "multiple" | "true_false";
  prompt: string;
  explanation: string;
  options: { label: string; correct: boolean }[];
};
const blank = (): Question => ({
  type: "single",
  prompt: "",
  explanation: "",
  options: [
    { label: "", correct: true },
    { label: "", correct: false },
  ],
});
export function QuizAuthor({
  lessons,
}: {
  lessons: { lesson_id: string; course_slug: string; title: string }[];
}) {
  const t = useTranslations("realQuiz");
  const locale = useLocale();
  const [questions, setQuestions] = useState<Question[]>([blank()]);
  const [lesson, setLesson] = useState(lessons[0]?.lesson_id ?? "");
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [translationReady, setTranslationReady] = useState(true);
  function update(index: number, fn: (q: Question) => Question) {
    setVersion(null);
    setQuestions((items) =>
      items.map((item, i) => (i === index ? fn(item) : item)),
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/learning/quiz/author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft",
          lessonId: lesson,
          locale,
          title: form.get("title"),
          instructions: form.get("instructions"),
          questions,
        }),
      });
      const data: unknown = await response.json();
      if (
        !response.ok ||
        !data ||
        typeof data !== "object" ||
        !("versionId" in data) ||
        typeof data.versionId !== "string"
      )
        throw new Error();
      setVersion(data.versionId);
      setTranslationReady(true);
      setMessage("draftSaved");
    } catch {
      setMessage("authorFailed");
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!version) return;
    setBusy(true);
    try {
      const response = await fetch("/api/learning/quiz/author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", versionId: version }),
      });
      if (!response.ok) throw new Error();
      setVersion(null);
      setMessage("published");
    } catch {
      setMessage("authorFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-role-form quiz-author" onSubmit={save}>
      <label>
        {t("lesson")}
        <select
          aria-label={t("lesson")}
          disabled={busy}
          value={lesson}
          onChange={(e) => {
            setVersion(null);
            setLesson(e.target.value);
          }}
          required
        >
          {lessons.map((item) => (
            <option key={item.lesson_id} value={item.lesson_id}>
              {item.course_slug} — {item.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t("title")}
        <input
          name="title"
          disabled={busy}
          maxLength={200}
          required
          onChange={() => setVersion(null)}
        />
      </label>
      <label>
        {t("instructions")}
        <textarea
          name="instructions"
          disabled={busy}
          maxLength={2000}
          onChange={() => setVersion(null)}
        />
      </label>
      {questions.map((q, index) => (
        <fieldset key={index} disabled={busy}>
          <legend>
            {t("question", { n: index + 1, total: questions.length })}
          </legend>
          <label>
            {t("type")}
            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value;
                if (
                  type === "single" ||
                  type === "multiple" ||
                  type === "true_false"
                )
                  update(index, (item) => ({
                    ...item,
                    type,
                    options:
                      type === "true_false"
                        ? item.options.slice(0, 2)
                        : item.options.map((option, i) => ({
                            ...option,
                            correct:
                              type === "single" ? i === 0 : option.correct,
                          })),
                  }));
              }}
            >
              <option value="single">{t("single")}</option>
              <option value="multiple">{t("multiple")}</option>
              <option value="true_false">{t("true_false")}</option>
            </select>
          </label>
          <label>
            {t("prompt")}
            <textarea
              value={q.prompt}
              maxLength={4000}
              required
              onChange={(e) =>
                update(index, (item) => ({ ...item, prompt: e.target.value }))
              }
            />
          </label>
          {q.options.map((option, optionIndex) => (
            <div className="quiz-author-option" key={optionIndex}>
              <label>
                {t("option")} {optionIndex + 1}
                <input
                  value={option.label}
                  maxLength={1000}
                  required
                  onChange={(e) =>
                    update(index, (item) => ({
                      ...item,
                      options: item.options.map((value, i) =>
                        i === optionIndex
                          ? { ...value, label: e.target.value }
                          : value,
                      ),
                    }))
                  }
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={option.correct}
                  onChange={(e) =>
                    update(index, (item) => ({
                      ...item,
                      options: item.options.map((value, i) => ({
                        ...value,
                        correct:
                          i === optionIndex
                            ? e.target.checked
                            : item.type === "multiple"
                              ? value.correct
                              : false,
                      })),
                    }))
                  }
                />
                {t("correct")}
              </label>
            </div>
          ))}
          {q.options.length < 10 && q.type !== "true_false" && (
            <button
              type="button"
              className="btn outline"
              onClick={() =>
                update(index, (item) => ({
                  ...item,
                  options: [...item.options, { label: "", correct: false }],
                }))
              }
            >
              {t("addOption")}
            </button>
          )}
          <label>
            {t("explanation")}
            <textarea
              value={q.explanation}
              maxLength={4000}
              onChange={(e) =>
                update(index, (item) => ({
                  ...item,
                  explanation: e.target.value,
                }))
              }
            />
          </label>
        </fieldset>
      ))}
      {questions.length < 100 && (
        <button
          type="button"
          className="btn outline"
          disabled={busy}
          onClick={() => {
            setVersion(null);
            setQuestions((items) => [...items, blank()]);
          }}
        >
          {t("addQuestion")}
        </button>
      )}
      <button className="btn" disabled={busy || !lesson}>
        {t("saveDraft")}
      </button>
      {version && (
        <>
          <DraftTranslation
            key={version}
            versionId={version}
            optionCounts={questions.map((q) => q.options.length)}
            onReady={setTranslationReady}
          />
          <button
            type="button"
            className="btn"
            disabled={busy || !translationReady}
            onClick={() => void publish()}
          >
            {t("publish")}
          </button>
        </>
      )}
      {message && <p role="status">{t(message)}</p>}
    </form>
  );
}
