"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  CircleCheck,
  Clock,
  FileText,
  Info,
  ListChecks,
  Play,
  RotateCcw,
  Send,
  Target,
  Trophy,
} from "lucide-react";
import { IconBox, Panel, Progress, Title } from "@/components/ui/primitives";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { courseImage } from "@/features/courses/components/course-image";
import { isQuizState, type QuizState } from "../types";
import { setQuizLock, useLeaveGuard } from "../quiz-lock";

const LETTERS: Record<Locale, string> = { en: "ABCDEFGHIJ", ar: "أبجدهوزحطي" };

export function LearnerQuiz({
  lessonId,
  locale,
  course,
}: {
  lessonId: string;
  locale: Locale;
  course: { title: string; slug: string };
}) {
  const t = useTranslations("realQuiz");
  const router = useRouter();
  const [state, setState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    setNotice("");
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
  const locked = state?.attempt?.status === "active" && !state.adminPreview;
  useEffect(() => {
    setQuizLock(locked);
    return () => setQuizLock(false);
  }, [locked]);
  useLeaveGuard(locked, t("leaveConfirm"));
  function enqueueSave(snapshot: Record<string, string[]>) {
    const saved = queue.current
      .catch(() => {})
      .then(() => request("save", snapshot));
    queue.current = saved.catch(() => {
      setError("saveFailed");
    });
    return saved;
  }
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
    setNotice("");
    void enqueueSave(snapshot);
  }
  async function saveAnswer() {
    setBusy(true);
    setError("");
    try {
      await enqueueSave(answersRef.current);
      setNotice("answerSaved");
    } catch {
      setError("saveFailed");
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    setError("");
    setNotice("");
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
  function go(index: number) {
    setQuestion(index);
    setNotice("");
  }

  const heading = (
    <Panel className="assessment-heading">
      <span className="odoo-tile assessment-tile">
        <Image src={courseImage(course.slug)} alt="" fill sizes="102px" />
      </span>
      <div>
        <div className="eyebrow" dir="auto">
          {state?.title || t("eyebrow")}
        </div>
        <h1 dir="auto">{course.title}</h1>
        <p className="assessment-intro" dir="auto">
          {state?.instructions || t("intro")}
        </p>
      </div>
    </Panel>
  );

  if (loading || !state)
    return (
      <div className="primary assessment-single">
        {heading}
        <Panel className="question-card real-quiz">
          {loading ? (
            <p aria-busy="true">{t("loading")}</p>
          ) : (
            <>
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
            </>
          )}
        </Panel>
      </div>
    );

  if (state.adminPreview)
    return (
      <div className="primary assessment-single">
        {heading}
        <Panel className="question-card real-quiz">
          <p role="status">{t("adminPreview")}</p>
          {state.questions.map((item, index) => (
            <fieldset key={item.id} disabled>
              <legend>
                {t("question", { n: index + 1, total: state.questions.length })}
                : <span dir="auto">{item.prompt}</span>
              </legend>
              <ul>
                {item.options.map((option) => (
                  <li key={option.id} dir="auto">
                    {option.label}
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}
        </Panel>
      </div>
    );

  const total = state.questions.length;
  const attempt = state.attempt;
  const active = attempt?.status === "active";
  const current = state.questions[question];
  const review = state.review?.find((item) => item.questionId === current?.id);
  const isAnswered = (id: string) => (answers[id] ?? []).length > 0;
  const answeredCount = state.questions.filter((q) => isAnswered(q.id)).length;
  const percentDone = total ? Math.round((answeredCount / total) * 100) : 0;
  const scorePercent =
    attempt?.possibleScore
      ? Math.round(((attempt.score ?? 0) / attempt.possibleScore) * 100)
      : 0;
  const minutes = Math.round(state.durationSeconds / 60);
  const attemptsLeft = state.attemptsUsed < state.maxAttempts;
  const messages = (
    <>
      {error && <p role="alert">{t(error)}</p>}
      {notice && (
        <p className="quiz-notice" role="status">
          <CircleCheck size={16} aria-hidden="true" /> {t(notice)}
        </p>
      )}
    </>
  );

  const instructions = (
    <Panel className="instructions">
      <Title>{t("instructionsTitle")}</Title>
      <div>
        <FileText aria-hidden="true" />
        <p>{t("instructionQuestions", { n: total })}</p>
      </div>
      <div>
        <Clock aria-hidden="true" />
        <p>{t("instructionTime", { n: minutes })}</p>
      </div>
      <div>
        <CircleCheck aria-hidden="true" />
        <p>{t("instructionSave")}</p>
      </div>
      <div>
        <RotateCcw aria-hidden="true" />
        <p>
          {t("instructionAttempts", {
            n: state.attemptsUsed,
            total: state.maxAttempts,
          })}
        </p>
      </div>
      <div>
        <Info aria-hidden="true" />
        <p>{t("instructionSubmit")}</p>
      </div>
      {active ? (
        <button
          className="btn green-button"
          disabled={busy}
          onClick={() => void submit()}
        >
          <Send aria-hidden="true" />
          {t(busy ? "saving" : "submit")}
        </button>
      ) : (
        attempt &&
        attemptsLeft && (
          <button
            className="btn green-button"
            disabled={busy}
            onClick={start}
          >
            <RotateCcw aria-hidden="true" />
            {t("retry")}
          </button>
        )
      )}
    </Panel>
  );

  return (
    <div className="columns assessment-columns real-quiz">
      <div className="primary">
        {heading}
        {active && (
          <div className="assessment-status">
            <Panel>
              <b>{t("question", { n: question + 1, total })}</b>
              <div className="inline-progress">
                <Progress value={percentDone} />
                <span>{t("percentComplete", { n: percentDone })}</span>
              </div>
            </Panel>
            <Panel className="timer">
              <Clock aria-hidden="true" />
              <div role="timer" aria-label={t("remaining")}>
                <small>{t("remaining")}</small>
                <b dir="ltr">
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </b>
              </div>
            </Panel>
          </div>
        )}
        <Panel className="question-card">
          {!attempt ? (
            <>
              <dl className="quiz-facts">
                {total > 0 && (
                  <div>
                    <ListChecks size={20} aria-hidden="true" />
                    <dt>{t("questionsLabel")}</dt>
                    <dd>{total}</dd>
                  </div>
                )}
                <div>
                  <Target size={20} aria-hidden="true" />
                  <dt>{t("passMark")}</dt>
                  <dd dir="ltr">{state.passPercent}%</dd>
                </div>
                <div>
                  <Clock size={20} aria-hidden="true" />
                  <dt>{t("timeLimit")}</dt>
                  <dd>{t("minutesValue", { n: minutes })}</dd>
                </div>
                <div>
                  <RotateCcw size={20} aria-hidden="true" />
                  <dt>{t("attemptLimit")}</dt>
                  <dd>
                    {t("attemptsValue", {
                      n: state.attemptsUsed,
                      total: state.maxAttempts,
                    })}
                  </dd>
                </div>
              </dl>
              {messages}
              <div className="quiz-start">
                <button className="btn" disabled={busy} onClick={start}>
                  <Play size={18} aria-hidden="true" /> {t("start")}
                </button>
                <p>{t("startHint")}</p>
              </div>
            </>
          ) : (
            <>
              {!active && (
                <div className="assessment-result quiz-result" role="status">
                  <IconBox icon={Trophy} color="green" />
                  <h2>{t(attempt.passed ? "passed" : "notPassed")}</h2>
                  <p className="score-value" dir="ltr">
                    {scorePercent}%
                  </p>
                  <p>
                    {t("score", {
                      earned: attempt.score ?? 0,
                      total: attempt.possibleScore ?? 0,
                    })}
                  </p>
                  {attempt.status === "timed_out" && <p>{t("timedOut")}</p>}
                </div>
              )}
              {current && (
                <>
                  <span className="question-label">
                    {t("questionChip", { n: question + 1 })}
                  </span>
                  <h2 id={`q-${current.id}`} dir="auto">
                    {current.prompt}
                  </h2>
                  <p>
                    {t(
                      current.type === "multiple" ? "selectMany" : "selectOne",
                    )}
                  </p>
                  <fieldset
                    className="answers"
                    aria-labelledby={`q-${current.id}`}
                    disabled={!active || busy}
                  >
                    {current.options.map((option, index) => {
                      const chosen = (answers[current.id] ?? []).includes(
                        option.id,
                      );
                      const correct = review?.correctOptions.includes(
                        option.id,
                      );
                      return (
                        <label
                          key={option.id}
                          className={[
                            chosen ? "chosen" : "",
                            review && correct ? "is-correct" : "",
                            review && chosen && !correct ? "is-incorrect" : "",
                          ].join(" ")}
                        >
                          <input
                            type={
                              current.type === "multiple" ? "checkbox" : "radio"
                            }
                            name={current.id}
                            checked={chosen}
                            onChange={() =>
                              select(option.id, current.type === "multiple")
                            }
                          />
                          <b aria-hidden="true">
                            {LETTERS[locale][index] ?? index + 1}.
                          </b>
                          <div>
                            <strong dir="auto">{option.label}</strong>
                          </div>
                        </label>
                      );
                    })}
                  </fieldset>
                  {review && (
                    <div className="lesson-notes quiz-review">
                      <h3>{t("correctAnswers")}</h3>
                      <ul>
                        {current.options
                          .filter((option) =>
                            review.correctOptions.includes(option.id),
                          )
                          .map((option) => (
                            <li key={option.id} dir="auto">
                              {option.label}
                            </li>
                          ))}
                      </ul>
                      {review.explanation && (
                        <p dir="auto">{review.explanation}</p>
                      )}
                    </div>
                  )}
                </>
              )}
              {messages}
              <div className="question-buttons">
                <button
                  className="btn outline"
                  disabled={question === 0 || busy}
                  onClick={() => go(question - 1)}
                >
                  <ChevronLeft className="flip-rtl" aria-hidden="true" />
                  {t("previous")}
                </button>
                <span />
                {active && (
                  <button
                    className="btn outline"
                    disabled={busy || !current || !isAnswered(current.id)}
                    onClick={() => void saveAnswer()}
                  >
                    <Bookmark size={19} aria-hidden="true" />
                    {t("saveAnswer")}
                  </button>
                )}
                <button
                  className="btn"
                  disabled={question >= total - 1 || busy}
                  onClick={() => go(question + 1)}
                >
                  {t("next")}
                  <ArrowRight className="flip-rtl" aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </Panel>
      </div>
      <aside className="right-rail" aria-label={t("sidebarLabel")}>
        {attempt && total > 0 && (
          <Panel>
            <Title>
              {t("progressTitle")}{" "}
              <span className="muted" dir="ltr">
                {question + 1}/{total}
              </span>
            </Title>
            <nav className="question-numbers" aria-label={t("progressTitle")}>
              {state.questions.map((item, index) => {
                const isCurrent = index === question;
                const done = isAnswered(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(index)}
                    className={isCurrent ? "current" : done ? "answered" : ""}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={t("goToQuestion", {
                      n: index + 1,
                      status: t(done ? "answered" : "notAnswered"),
                    })}
                  >
                    {done && !isCurrent ? (
                      <Check size={21} aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="legend" aria-hidden="true">
              <span>
                <i className="green-dot" />
                {t("answered")}
              </span>
              <span>
                <i className="dot" />
                {t("current")}
              </span>
              <span>
                <i />
                {t("notAnswered")}
              </span>
            </div>
          </Panel>
        )}
        <Panel className="pass-mark">
          <IconBox icon={Trophy} color="green" />
          <div>
            <p>{t("passMark")}</p>
            <p className="pass-value" dir="ltr">
              {state.passPercent}%
            </p>
          </div>
          <p>{t("passDescription", { n: state.passPercent })}</p>
        </Panel>
        {instructions}
      </aside>
    </div>
  );
}
