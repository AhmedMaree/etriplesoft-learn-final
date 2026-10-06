"use client";

import React, { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ChevronRight, ChevronLeft, ArrowRight, Clock, Trophy, Bookmark, Check, Send, FileText, Info } from 'lucide-react';
import { Button, Panel, Title, IconBox, Progress } from '@/components/ui/primitives';
import { saveStored, useStoredValue } from '@/lib/browser/demo-storage';
import { useDemoToast } from '@/lib/browser/demo-toast';
import { useDemoNavigation } from '@/hooks/use-demo-navigation';
import { featuredCourse } from '@/features/courses/data/demo-courses';
import { assessmentCorrectAnswers, assessmentOptions, assessmentQuestions } from '@/features/assessments/data/demo-assessment';
import { useTranslations } from 'next-intl';

export function Assessment() {
  const t = useTranslations("assessment");
  const coursesText = useTranslations("courses");
  const navigate = useDemoNavigation();
  const notify = useDemoToast();

  const [q, setQ] = useState(4);
  const defaultAnswers = {
    1: 0,
    2: 1,
    3: 2,
    4: 0,
  };
  const savedAnswers = useStoredValue(
    "assessment-answers",
    JSON.stringify(defaultAnswers),
  );
  let answers: Record<number, number> = defaultAnswers;
  try {
    answers = JSON.parse(savedAnswers) as Record<number, number>;
  } catch {
    answers = defaultAnswers;
  }
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(755);
  const assessmentComplete = submitted || remaining === 0;
  React.useEffect(() => {
    if (assessmentComplete) return;
    const timer = setInterval(
      () => setRemaining((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [assessmentComplete]);
  const choices = q === 1 ? ["CRM", ...assessmentOptions.slice(1)] : assessmentOptions;
  // Demo-only client-side scoring; production assessment results must be server-authoritative.
  const score =
    Object.entries(answers).filter(([n, a]) => assessmentCorrectAnswers[+n - 1] === a).length *
    10;
  return (
    <Panel className="assessment-shell">
      <div className="crumb">
        <Link href="/courses">{coursesText("myCourses")}</Link>
        <ChevronRight />
        <Link href="/courses">{coursesText("allCourses")}</Link>
        <ChevronRight />
        <Link href="/detail-course">{featuredCourse.name}</Link>
        <ChevronRight />
        <span>{t("final")}</span>
      </div>
      <div className="columns assessment-columns">
        <div className="primary">
          <Panel className="assessment-heading">
            <span className="odoo-tile">odoo</span>
            <div>
              <div className="eyebrow">{t("final")}</div>
              <h1>{featuredCourse.name}</h1>
              <p>
                {t("testUnderstanding")}
              </p>
            </div>
          </Panel>
          <div className="assessment-status">
            <Panel>
              <b>{t("question")} {q} {t("of")} 10</b>
              <div className="inline-progress">
                <Progress value={q * 10} />
                <span>{q * 10}% {t("complete")}</span>
              </div>
            </Panel>
            <Panel className="timer">
              <Clock />
              <div>
                <small>{t("timeRemaining")}</small>
                <b>
                  {Math.floor(remaining / 60)}:
                  {String(remaining % 60).padStart(2, "0")}
                </b>
              </div>
            </Panel>
          </div>
          <Panel className="question-card">
            {assessmentComplete ? (
              <div className="assessment-result">
                <IconBox icon={Trophy} color="green" />
                <h2>{t("title")} {score >= 70 ? t("complete") : t("results")}</h2>
                <h1>{score}%</h1>
                <p>
                  {score >= 70
                    ? t("congratulations")
                    : t("needPass")}
                </p>
                <Button
                  onClick={() =>
                    score >= 70 ? navigate("certificates") : setSubmitted(false)
                  }
                >
                  {score >= 70 ? t("viewCertificate") : t("reviewAnswers")}
                  <ArrowRight size={18} />
                </Button>
              </div>
            ) : (
              <>
                <span className="question-label">{t("question")} {q}</span>
                <h2>{assessmentQuestions[q - 1]}</h2>
                <p>{t("selectBest")}</p>
                <div className="answers">
                  {choices.map((o, i) => (
                    <label key={o} className={answers[q] === i ? "chosen" : ""}>
                      <input
                        type="radio"
                        name="answer"
                        checked={answers[q] === i}
                        onChange={() =>
                          saveStored(
                            "assessment-answers",
                            JSON.stringify({ ...answers, [q]: i }),
                          )
                        }
                      />
                      <b>{String.fromCharCode(65 + i)}.</b>
                      <div>
                        <strong>{o}</strong>
                        <small>
                          {
                            [
                              "Used to manage customer invoices, vendor bills, and track payments.",
                              "Used to manage quotations, sales orders, and customer relationships.",
                              "Used to manage stock levels, warehouse operations, and product movements.",
                              "Used to manage vendor purchases and incoming receipts.",
                            ][i]
                          }
                        </small>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="question-buttons">
                  <Button
                    outline
                    disabled={q === 1}
                    onClick={() => setQ(q - 1)}
                  >
                    <ChevronLeft />
                    {t("previousQuestion")}
                  </Button>
                  <span />
                  <Button
                    outline
                    onClick={() => {
                      saveStored(
                        "assessment-answers",
                        JSON.stringify(answers),
                      );
                    notify(t("answerSaved"));
                    }}
                  >
                    <Bookmark size={19} />
                    {t("saveAnswer")}
                  </Button>
                  <Button disabled={q === 10} onClick={() => setQ(q + 1)}>
                    {t("nextQuestion")} <ArrowRight />
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </div>
        <aside className="right-rail">
          <Panel>
            <Title>
              {t("assessmentProgress")} <span className="muted">{q}/10</span>
            </Title>
            <div className="question-numbers">
              {Array.from({ length: 10 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQ(i + 1);
                    setSubmitted(false);
                  }}
                  className={
                    q === i + 1
                      ? "current"
                      : answers[i + 1] !== undefined
                        ? "answered"
                        : ""
                  }
                >
                  {answers[i + 1] !== undefined && i + 1 !== q ? (
                    <Check size={21} />
                  ) : (
                    i + 1
                  )}
                </button>
              ))}
            </div>
            <div className="legend">
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
          <Panel className="pass-mark">
            <IconBox icon={Trophy} color="green" />
            <div>
              <p>{t("passMark")}</p>
              <h1>70%</h1>
            </div>
            <p>
              {t("passDescription")}
            </p>
          </Panel>
          <Panel className="instructions">
            <Title>{t("assessmentInstructions")}</Title>
            {[FileText, Clock, Check, Info].map((I, i) => (
              <div key={i}>
                <I />
                <p>
                  {
                    [
                      t("multipleChoice"),
                      t("timeLimit"),
                      t("saveAndReturn"),
                      t("submitComplete"),
                    ][i]
                  }
                </p>
              </div>
            ))}
            <Button
              className="green-button"
              onClick={() => {
                if (Object.keys(answers).length < 10) {
                  notify(t("answerAll"));
                  return;
                }
                setSubmitted(true);
              }}
            >
              <Send />
              {t("submit")}
            </Button>
          </Panel>
        </aside>
      </div>
    </Panel>
  );
}
