"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
export function DraftTranslation({
  versionId,
  optionCounts,
  onReady,
}: {
  versionId: string;
  optionCounts: number[];
  onReady: (ready: boolean) => void;
}) {
  const t = useTranslations("realQuiz");
  const locale = useLocale() === "en" ? "ar" : "en";
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState(() =>
    optionCounts.map((n) => ({
      prompt: "",
      explanation: "",
      options: Array.from({ length: n }, () => ""),
    })),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  function edit() {
    onReady(false);
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/learning/quiz/author", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "localize",
          versionId,
          locale,
          title,
          instructions,
          questions,
        }),
      });
      if (!response.ok) throw new Error();
      onReady(true);
      setMessage("translationSaved");
    } catch {
      setMessage("authorFailed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset disabled={busy}>
      <legend>{t("translation")}</legend>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            onReady(!e.target.checked);
          }}
        />
        {t("addTranslation", {
          locale: locale === "ar" ? "العربية" : "English",
        })}
      </label>
      {enabled && (
        <>
          <label>
            {t("title")}
            <input
              value={title}
              maxLength={200}
              onChange={(e) => {
                edit();
                setTitle(e.target.value);
              }}
            />
          </label>
          <label>
            {t("instructions")}
            <textarea
              value={instructions}
              maxLength={2000}
              onChange={(e) => {
                edit();
                setInstructions(e.target.value);
              }}
            />
          </label>
          {questions.map((q, index) => (
            <fieldset key={index}>
              <legend>
                {t("question", { n: index + 1, total: questions.length })}
              </legend>
              <label>
                {t("prompt")}
                <textarea
                  value={q.prompt}
                  maxLength={4000}
                  onChange={(e) => {
                    edit();
                    setQuestions((items) =>
                      items.map((item, i) =>
                        i === index
                          ? { ...item, prompt: e.target.value }
                          : item,
                      ),
                    );
                  }}
                />
              </label>
              {q.options.map((label, j) => (
                <label key={j}>
                  {t("option")} {j + 1}
                  <input
                    value={label}
                    maxLength={1000}
                    onChange={(e) => {
                      edit();
                      setQuestions((items) =>
                        items.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                options: item.options.map((value, k) =>
                                  k === j ? e.target.value : value,
                                ),
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </label>
              ))}
              <label>
                {t("explanation")}
                <textarea
                  value={q.explanation}
                  maxLength={4000}
                  onChange={(e) => {
                    edit();
                    setQuestions((items) =>
                      items.map((item, i) =>
                        i === index
                          ? { ...item, explanation: e.target.value }
                          : item,
                      ),
                    );
                  }}
                />
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            className="btn outline"
            onClick={() => void save()}
          >
            {t("saveTranslation")}
          </button>
          {message && <p role="status">{t(message)}</p>}
        </>
      )}
    </fieldset>
  );
}
