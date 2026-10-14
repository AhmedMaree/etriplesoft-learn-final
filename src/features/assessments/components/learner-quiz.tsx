"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { isQuizState, type QuizState } from "../types";

export function LearnerQuiz({
  lessonId,
  locale,
}: {
  lessonId: string;
  locale: Locale;
}) {
  const t = useTranslations("realQuiz");
  const router = useRouter();
  const [state, setState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [remaining, setRemaining] = useState(0);
  const stateRef = useRef<QuizState | null>(null);
  const answersRef = useRef<Record<string, string[]>>({});
  const sequence = useRef(0);
  const queue = useRef(Promise.resolve());
  const clock = useRef({ deadline: 0, at: 0 });
  const timeoutRequested = useRef(false);
  const request = useCallback(
    async (
      action: "get" | "start" | "save" | "submit",
      snapshot?: Record<string, string[]>,
    ) => {
      const current = stateRef.current;
      const response = await fetch("/api/learning/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          lessonId,
          locale,
          action,
          ...(current?.attempt && action !== "start"
            ? { attemptId: current.attempt.id }
            : {}),
          ...(snapshot
            ? { answers: snapshot, sequence: ++sequence.current }
            : {}),
        }),
      });
      const value: unknown = await response.json();
      if (
        !response.ok ||
        !value ||
        typeof value !== "object" ||
        !("quiz" in value)
      )
        throw new Error(response.status === 409 ? "rule" : "failed");
      if (value.quiz !== null && !isQuizState(value.quiz))
        throw new Error("failed");
      const next = value.quiz;
      stateRef.current = next;
      sequence.current = Math.max(
        sequence.current,
        next?.attempt?.sequence ?? 0,
      );
      setState(next);
      if (next?.attempt) {
        clock.current = {
          deadline:
            Date.parse(next.attempt.deadline) - Date.parse(next.serverNow),
          at: performance.now(),
        };
        setRemaining(Math.max(0, Math.ceil(clock.current.deadline / 1000)));
        if (action !== "save") {
          answersRef.current = next.attempt.answers;
          setAnswers(next.attempt.answers);
        }
        if (next.attempt.status !== "active") router.refresh();
      }
    },
    [lessonId, locale, router],
  );
  useEffect(() => {
    let active = true;
    request("get")
      .catch(() => {
        if (active) setError("failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request]);
  const submit = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await queue.current;
      await request("submit", answersRef.current);
    } catch (e) {
      setError(e instanceof Error && e.message === "rule" ? "rule" : "failed");
      timeoutRequested.current = false;
    } finally {
      setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    if (state?.attempt?.status !== "active") return;
    const timer = setInterval(() => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (clock.current.deadline - (performance.now() - clock.current.at)) /
            1000,
        ),
      );
      setRemaining(seconds);
      if (!seconds && !timeoutRequested.current) {
        timeoutRequested.current = true;
        void submit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state?.attempt?.status, submit]);
  function select(option: string, multiple: boolean) {
    const q = state?.questions[question];
    if (!q) return;
    const existing = answersRef.current[q.id] ?? [];
    const value = multiple
      ? existing.includes(option)
        ? existing.filter((id) => id !== option)
        : [...existing, option]
      : [option];
    const snapshot = { ...answersRef.current, [q.id]: value };
    answersRef.current = snapshot;
    setAnswers(snapshot);
    setError("");
    queue.current = queue.current
      .catch(() => {})
      .then(() => request("save", snapshot))
      .catch(() => {
        setError("saveFailed");
      });
  }
  async function start() {
    setBusy(true);
    setError("");
    timeoutRequested.current = false;
    try {
      await request("start");
      setQuestion(0);
    } catch (e) {
      setError(e instanceof Error && e.message === "rule" ? "rule" : "failed");
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <section className="panel question-card" aria-busy="true">
        {t("loading")}
      </section>
    );
  if (!state)
    return (
      <section className="panel question-card">
        <p role="status">{t(error ? "failed" : "unavailable")}</p>
        {error && (
          <button
            className="btn outline"
            onClick={() => {
              setLoading(true);
              request("get")
                .then(() => setError(""))
                .catch(() => setError("failed"))
                .finally(() => setLoading(false));
            }}
          >
            {t("reload")}
          </button>
        )}
      </section>
    );
  const current = state.questions[question];
  const active = state.attempt?.status === "active";
  const review = state.review?.find((item) => item.questionId === current?.id);
  return (
    <section className="panel question-card real-quiz">
      <h2 dir="auto">{state.title}</h2>
      <p dir="auto">{state.instructions}</p>
      <p>
        {t("rules", {
          pass: state.passPercent,
          attempts: state.maxAttempts,
          minutes: state.durationSeconds / 60,
        })}
      </p>
      <p>{t("used", { n: state.attemptsUsed, total: state.maxAttempts })}</p>
      {error && <p role="alert">{t(error)}</p>}
      {!state.attempt ? (
        <button className="btn" disabled={busy} onClick={start}>
          {t("start")}
        </button>
      ) : (
        <>
          {active ? (
            <p className="timer" aria-label={t("remaining")}>
              {t("remaining")}{" "}
              <b dir="ltr">
                {Math.floor(remaining / 60)}:
                {String(remaining % 60).padStart(2, "0")}
              </b>
            </p>
          ) : (
            <div role="status">
              <h3>{t(state.attempt.passed ? "passed" : "notPassed")}</h3>
              <p>
                {t("score", {
                  earned: state.attempt.score ?? 0,
                  total: state.attempt.possibleScore ?? 0,
                })}
              </p>
              {state.attempt.status === "timed_out" && <p>{t("timedOut")}</p>}
            </div>
          )}
          {current && (
            <fieldset disabled={!active || busy}>
              <legend>
                {t("question", {
                  n: question + 1,
                  total: state.questions.length,
                })}
                : <span dir="auto">{current.prompt}</span>
              </legend>
              <p>
                {t(current.type === "multiple" ? "selectMany" : "selectOne")}
              </p>
              <div className="answers">
                {current.options.map((option) => (
                  <label
                    key={option.id}
                    className={
                      (answers[current.id] ?? []).includes(option.id)
                        ? "chosen"
                        : ""
                    }
                  >
                    <input
                      type={current.type === "multiple" ? "checkbox" : "radio"}
                      name={current.id}
                      checked={(answers[current.id] ?? []).includes(option.id)}
                      onChange={() =>
                        select(option.id, current.type === "multiple")
                      }
                    />
                    <span dir="auto">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {review && (
            <div className="lesson-notes">
              <h3>{t("correctAnswers")}</h3>
              <ul>
                {current.options
                  .filter((option) => review.correctOptions.includes(option.id))
                  .map((option) => (
                    <li key={option.id} dir="auto">
                      {option.label}
                    </li>
                  ))}
              </ul>
              <p dir="auto">{review.explanation}</p>
            </div>
          )}
          <div className="lesson-pager">
            <button
              className="btn outline"
              disabled={question === 0 || busy}
              onClick={() => setQuestion((n) => n - 1)}
            >
              {t("previous")}
            </button>
            <button
              className="btn outline"
              disabled={question >= state.questions.length - 1 || busy}
              onClick={() => setQuestion((n) => n + 1)}
            >
              {t("next")}
            </button>
          </div>
          {active ? (
            <button
              className="btn"
              disabled={busy}
              onClick={() => void submit()}
            >
              {t(busy ? "saving" : "submit")}
            </button>
          ) : (
            state.attemptsUsed < state.maxAttempts && (
              <button className="btn" disabled={busy} onClick={start}>
                {t("retry")}
              </button>
            )
          )}
        </>
      )}
    </section>
  );
}
