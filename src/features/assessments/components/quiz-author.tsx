"use client";
import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DraftTranslation } from "./draft-translation";

type Question = {
  editorId: number;
  type: "single" | "multiple" | "true_false";
  prompt: string;
  explanation: string;
  options: { label: string; correct: boolean }[];
};

const blank = (editorId: number): Question => ({
  editorId,
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
  const nextEditorId = useRef(1);
  const [questions, setQuestions] = useState<Question[]>(() => [blank(0)]);
  const [lesson, setLesson] = useState(lessons[0]?.lesson_id ?? "");
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [translationReady, setTranslationReady] = useState(true);

  const currentLesson = lessons.find((item) => item.lesson_id === lesson);
  const canSave =
    Boolean(lesson) &&
    questions.length > 0 &&
    questions.every(
      (question) =>
        question.prompt.trim().length > 0 &&
        question.options.length >= 2 &&
        question.options.every((option) => option.label.trim().length > 0) &&
        question.options.some((option) => option.correct),
    );

  function update(editorId: number, fn: (question: Question) => Question) {
    setVersion(null);
    setQuestions((items) =>
      items.map((item) => (item.editorId === editorId ? fn(item) : item)),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
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
          questions: questions.map((question) => ({
            type: question.type,
            prompt: question.prompt,
            explanation: question.explanation,
            options: question.options,
          })),
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
    if (!version || !translationReady) return;
    setBusy(true);
    setMessage("");
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
    <form className="quiz-author" onSubmit={save}>
      <div className="quiz-author-main">
        <section className="quiz-author-basics" aria-labelledby="quiz-basics-title">
          <h2 id="quiz-basics-title">{t("basicsTitle")}</h2>
          <label>
            {t("lesson")}
            <select
              aria-label={t("lesson")}
              disabled={busy}
              value={lesson}
              onChange={(event) => {
                setVersion(null);
                setLesson(event.target.value);
              }}
              required
            >
              {lessons.map((item) => (
                <option key={item.lesson_id} value={item.lesson_id}>
                  {item.course_slug} / {item.title}
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
          {currentLesson && (
            <p className="quiz-author-source" dir="auto">
              <span>{t("contentSource")}</span>
              <strong>{currentLesson.title}</strong>
              <span>{currentLesson.course_slug}</span>
            </p>
          )}
        </section>

        <section className="quiz-author-questions" aria-labelledby="quiz-questions-title">
          <div className="quiz-author-section-heading">
            <div>
              <h2 id="quiz-questions-title">{t("questionsTitle")}</h2>
              <p>{t("questionsCount", { count: questions.length })}</p>
            </div>
            {questions.length < 100 && (
              <button
                type="button"
                className="btn outline"
                disabled={busy}
                onClick={() => {
                  setVersion(null);
                  setQuestions((items) => [...items, blank(nextEditorId.current++)]);
                }}
              >
                {t("addQuestion")}
              </button>
            )}
          </div>

          {questions.map((question, index) => (
            <fieldset className="quiz-author-question" key={question.editorId} disabled={busy}>
              <legend>
                {t("question", { n: index + 1, total: questions.length })}
              </legend>
              <div className="quiz-author-question-heading">
                <label>
                  {t("type")}
                  <select
                    value={question.type}
                    onChange={(event) => {
                      const type = event.target.value;
                      if (type === "single" || type === "multiple" || type === "true_false")
                        update(question.editorId, (item) => ({
                          ...item,
                          type,
                          options:
                            type === "true_false"
                              ? [
                                  { label: t("trueOption"), correct: true },
                                  { label: t("falseOption"), correct: false },
                                ]
                              : item.options.map((option, optionIndex) => ({
                                  ...option,
                                  correct:
                                    type === "single" ? optionIndex === 0 : option.correct,
                                })),
                        }));
                    }}
                  >
                    <option value="single">{t("single")}</option>
                    <option value="multiple">{t("multiple")}</option>
                    <option value="true_false">{t("true_false")}</option>
                  </select>
                </label>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="quiz-author-remove"
                    aria-label={t("removeQuestion", { n: index + 1 })}
                    onClick={() => {
                      setVersion(null);
                      setQuestions((items) =>
                        items.filter((item) => item.editorId !== question.editorId),
                      );
                    }}
                  >
                    {t("remove")}
                  </button>
                )}
              </div>
              <label>
                {t("prompt")}
                <textarea
                  value={question.prompt}
                  maxLength={4000}
                  required
                  onChange={(event) =>
                    update(question.editorId, (item) => ({
                      ...item,
                      prompt: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="quiz-author-options">
                {question.options.map((option, optionIndex) => (
                  <div className="quiz-author-option" key={optionIndex}>
                    <label>
                      {t("option", { n: optionIndex + 1 })}
                      <input
                        value={option.label}
                        maxLength={1000}
                        required
                        onChange={(event) =>
                          update(question.editorId, (item) => ({
                            ...item,
                            options: item.options.map((value, index) =>
                              index === optionIndex
                                ? { ...value, label: event.target.value }
                                : value,
                            ),
                          }))
                        }
                      />
                    </label>
                    <label className="quiz-author-correct">
                      <input
                        type={question.type === "multiple" ? "checkbox" : "radio"}
                        name={`correct-${question.editorId}`}
                        checked={option.correct}
                        onChange={(event) =>
                          update(question.editorId, (item) => ({
                            ...item,
                            options: item.options.map((value, index) => ({
                              ...value,
                              correct:
                                index === optionIndex
                                  ? event.target.checked
                                  : item.type === "multiple"
                                    ? value.correct
                                    : false,
                            })),
                          }))
                        }
                      />
                      {t("correct")}
                    </label>
                    {question.options.length > 2 && question.type !== "true_false" && (
                      <button
                        type="button"
                        className="quiz-author-remove quiz-author-remove-option"
                        aria-label={t("removeOption", { n: optionIndex + 1 })}
                        onClick={() =>
                          update(question.editorId, (item) => ({
                            ...item,
                            options: item.options.filter((_, index) => index !== optionIndex),
                          }))
                        }
                      >
                        {t("remove")}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {question.options.length < 10 && question.type !== "true_false" && (
                <button
                  type="button"
                  className="btn outline quiz-author-add-option"
                  onClick={() =>
                    update(question.editorId, (item) => ({
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
                  value={question.explanation}
                  maxLength={4000}
                  onChange={(event) =>
                    update(question.editorId, (item) => ({
                      ...item,
                      explanation: event.target.value,
                    }))
                  }
                />
              </label>
            </fieldset>
          ))}

          <div className="quiz-author-actions">
            <button className="btn" disabled={busy || !canSave}>
              {t("saveDraft")}
            </button>
            {version && (
              <button
                type="button"
                className="btn"
                disabled={busy || !translationReady}
                onClick={() => void publish()}
              >
                {t("publish")}
              </button>
            )}
            {message && <p role="status">{t(message)}</p>}
          </div>
          {version && (
            <DraftTranslation
              key={version}
              versionId={version}
              optionCounts={questions.map((question) => question.options.length)}
              onReady={setTranslationReady}
            />
          )}
        </section>
      </div>

      <aside className="quiz-author-guide" aria-label={t("publishingGuideTitle")}>
        <h2>{t("publishingGuideTitle")}</h2>
        <p>{t("publishingGuideDescription")}</p>
        <dl>
          <div>
            <dt>{t("passMark")}</dt>
            <dd>70%</dd>
          </div>
          <div>
            <dt>{t("attemptLimit")}</dt>
            <dd>{t("attemptLimitValue")}</dd>
          </div>
          <div>
            <dt>{t("timeLimit")}</dt>
            <dd>{t("timeLimitValue")}</dd>
          </div>
        </dl>
        <p className="quiz-author-guide-note">{t("answerKeyNote")}</p>
      </aside>
    </form>
  );
}
