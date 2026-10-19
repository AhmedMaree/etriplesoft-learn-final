"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, CircleCheck, CircleX, RotateCcw, Send } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { isQuizState, type QuizState } from "../types";

type Props = {
  /** The practice-check assessment lesson paired with the video. */
  lessonId: string;
  locale: Locale;
  next: { href: string; title: string } | null;
  onWatchAgain: () => void;
};

const LETTERS: Record<Locale, string> = { en: "ABCDEFGHIJ", ar: "أبجدهوزحطي" };

/**
 * The video's short untimed practice check, shown inside the video panel once the video ends.
 * Scoring, attempt limits and answer keys stay in learner_quiz_action; this only renders its projection.
 */
export function VideoCheck({ lessonId, locale, next, onWatchAgain }: Props) {
  const t = useTranslations("videoCheck");
  const router = useRouter();
  const [state, setState] = useState<QuizState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  const request = useCallback(
    async (action: "get" | "start" | "submit", current?: QuizState, snapshot?: Record<string, string[]>) => {
      const response = await fetch("/api/learning/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          lessonId,
          locale,
          action,
          ...(action === "submit" && current?.attempt
            ? { attemptId: current.attempt.id, answers: snapshot, sequence: current.attempt.sequence + 1 }
            : {}),
        }),
      });
      const value: unknown = await response.json().catch(() => null);
      if (!response.ok || !value || typeof value !== "object" || !("quiz" in value))
        throw new Error(response.status === 409 ? "rule" : "failed");
      if (value.quiz === null) return null;
      if (!isQuizState(value.quiz)) throw new Error("failed");
      return value.quiz;
    },
    [lessonId, locale],
  );

  function show(quiz: QuizState) {
    setState(quiz);
    setAnswers(quiz.attempt?.answers ?? {});
    setStatus("ready");
  }

  // Open the latest attempt, or start the first one: the check is untimed, so an unfinished attempt simply waits.
  useEffect(() => {
    let active = true;
    (async () => {
      let quiz = await request("get");
      if (quiz && !quiz.adminPreview && !quiz.attempt && quiz.attemptsUsed < quiz.maxAttempts) quiz = await request("start");
      if (!active) return;
      if (quiz) show(quiz);
      else setStatus("missing");
    })().catch(() => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [request]);

  useEffect(() => { if (status === "ready") heading.current?.focus(); }, [status]);

  async function run(action: "start" | "submit") {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      const quiz = await request(action, state, answers);
      if (quiz) show(quiz);
      if (action === "submit") router.refresh();
    } catch (e) {
      setError(e instanceof Error && e.message === "rule" ? "rule" : "failed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "missing") return null;
  if (status !== "ready" || !state)
    return (
      <div className="video-check" aria-busy={status === "loading"}>
        <p role={status === "error" ? "alert" : "status"}>{t(status === "error" ? "failed" : "loading")}</p>
        <div className="video-check-actions">
          <button type="button" className="btn outline" onClick={onWatchAgain}>
            <RotateCcw size={16} aria-hidden="true" /> {t("watchAgain")}
          </button>
        </div>
      </div>
    );

  const attempt = state.attempt;
  const active = attempt?.status === "active";
  const finished = !!attempt && !active;
  const allAnswered = state.questions.every((q) => (answers[q.id] ?? []).length > 0);
  const canRetry = finished && !attempt.passed && state.attemptsUsed < state.maxAttempts;

  function select(questionId: string, optionId: string, multiple: boolean) {
    setError("");
    setAnswers((current) => {
      const chosen = current[questionId] ?? [];
      return {
        ...current,
        [questionId]: multiple
          ? chosen.includes(optionId) ? chosen.filter((id) => id !== optionId) : [...chosen, optionId]
          : [optionId],
      };
    });
  }

  return (
    <section className="video-check" aria-labelledby="video-check-title">
      <header className="video-check-head">
        <small>{t("eyebrow")}</small>
        <h2 id="video-check-title" ref={heading} tabIndex={-1}>
          {t("title", { n: state.questions.length })}
        </h2>
        <p>{state.adminPreview ? t("adminPreview") : t("intro")}</p>
      </header>

      {finished && (
        <p className={`video-check-result ${attempt.passed ? "is-passed" : "is-failed"}`} role="status">
          {attempt.passed ? <CircleCheck size={20} aria-hidden="true" /> : <CircleX size={20} aria-hidden="true" />}
          {t(attempt.passed ? "passed" : "notPassed", { earned: attempt.score ?? 0, total: attempt.possibleScore ?? 0 })}
        </p>
      )}

      <ol className="video-check-questions">
        {state.questions.map((question) => {
          const review = state.review?.find((item) => item.questionId === question.id);
          const multiple = question.type === "multiple";
          return (
            <li key={question.id}>
              <fieldset className="answers" disabled={!active || busy} aria-describedby={`vc-${question.id}`}>
                <legend id={`vc-${question.id}`} dir="auto">{question.prompt}</legend>
                {question.options.map((option, index) => {
                  const chosen = (answers[question.id] ?? []).includes(option.id);
                  const correct = review?.correctOptions.includes(option.id);
                  return (
                    <label
                      key={option.id}
                      className={[chosen && "chosen", review && correct && "is-correct", review && chosen && !correct && "is-incorrect"].filter(Boolean).join(" ")}
                    >
                      <input
                        type={multiple ? "checkbox" : "radio"}
                        name={`vc-${question.id}`}
                        checked={chosen}
                        onChange={() => select(question.id, option.id, multiple)}
                      />
                      <b aria-hidden="true">{LETTERS[locale][index] ?? index + 1}.</b>
                      <div><strong dir="auto">{option.label}</strong></div>
                    </label>
                  );
                })}
              </fieldset>
              {review?.explanation && <p className="video-check-explanation" dir="auto">{review.explanation}</p>}
            </li>
          );
        })}
      </ol>

      {error && <p role="alert">{t(error)}</p>}
      <div className="video-check-actions">
        <button type="button" className="btn outline" onClick={onWatchAgain} disabled={busy}>
          <RotateCcw size={16} aria-hidden="true" /> {t("watchAgain")}
        </button>
        {active && (
          <button type="button" className="btn" disabled={busy || !allAnswered} onClick={() => void run("submit")}>
            <Send size={16} aria-hidden="true" /> {t(busy ? "checking" : "submit")}
          </button>
        )}
        {canRetry && (
          <button type="button" className="btn outline" disabled={busy} onClick={() => void run("start")}>
            <RotateCcw size={16} aria-hidden="true" /> {t("retry", { n: state.maxAttempts - state.attemptsUsed })}
          </button>
        )}
        {(finished || state.adminPreview) && next && (
          <Link className="btn" href={next.href}>
            {t("next")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
