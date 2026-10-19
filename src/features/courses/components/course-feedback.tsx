"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { MessageSquare, Star } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type {
  CourseFeedbackSummary,
  CourseQuestion,
  CourseReview,
} from "../server/course-feedback";
import {
  answerQuestionAction,
  askQuestionAction,
  deleteAnswerAction,
  deleteQuestionAction,
  deleteReviewAction,
  saveReviewAction,
  type FeedbackActionState,
} from "../server/feedback-actions";

const MAX_TEXT = 2000;
type Access = { signedIn: boolean; entitled: boolean; loginHref: string };

export function RatingStars({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  const t = useTranslations("courseFeedback");
  return (
    <span
      className="cf-stars"
      role="img"
      aria-label={t("ratingAria", { rating: String(rating) })}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(rating) ? "on" : ""}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

function FeedbackMessage({
  state,
  success,
}: {
  state: FeedbackActionState;
  success?: string;
}) {
  const t = useTranslations("courseFeedback");
  if (state.status === "error" && state.error) {
    return (
      <p role="alert" className="cf-note error">
        {t(`errors.${state.error}`)}
      </p>
    );
  }
  if (state.status === "ok" && success)
    return (
      <p role="status" className="cf-note ok">
        {success}
      </p>
    );
  return null;
}

function RemoveButton({
  id,
  locale,
  action,
}: {
  id: string;
  locale: Locale;
  action: typeof deleteReviewAction;
}) {
  const t = useTranslations("courseFeedback");
  const [state, formAction, pending] = useActionState<
    FeedbackActionState,
    FormData
  >(action, {});
  return (
    <form
      action={formAction}
      className="cf-remove"
      onSubmit={(event) => {
        if (!window.confirm(t("confirmRemove"))) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <button type="submit" className="text-link" disabled={pending}>
        {pending ? t("removing") : t("remove")}
      </button>
      <FeedbackMessage state={state} />
    </form>
  );
}

function AccessNote({
  access,
  signInKey,
  enrollKey,
}: {
  access: Access;
  signInKey: "signInToReview" | "signInToAsk";
  enrollKey: "enrollToReview" | "enrollToAsk";
}) {
  const t = useTranslations("courseFeedback");
  return (
    <p className="cf-access">
      {access.signedIn ? (
        t(enrollKey)
      ) : (
        <>
          {t(signInKey)}{" "}
          <Link className="text-link" href={access.loginHref}>
            {t("signIn")}
          </Link>
        </>
      )}
    </p>
  );
}

function useDate() {
  const format = useFormatter();
  return (value: string) =>
    format.dateTime(new Date(value), {
      year: "numeric",
      month: "short",
      day: "numeric",
      numberingSystem: "latn",
    });
}

function ReviewForm({
  courseId,
  locale,
  mine,
}: {
  courseId: string;
  locale: Locale;
  mine: CourseReview | undefined;
}) {
  const t = useTranslations("courseFeedback");
  const base = useId();
  const [state, formAction, pending] = useActionState<
    FeedbackActionState,
    FormData
  >(saveReviewAction, {});
  const [rating, setRating] = useState(mine?.rating ?? 0);
  return (
    <form action={formAction} className="cf-form">
      <h3>{mine ? t("editReview") : t("writeReview")}</h3>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="locale" value={locale} />
      <fieldset className="cf-rating-input">
        <legend>{t("yourRating")}</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={n <= rating ? "on" : ""}>
            <input
              type="radio"
              name="rating"
              value={n}
              required
              checked={rating === n}
              onChange={() => setRating(n)}
            />
            <Star size={24} aria-hidden="true" />
            <span className="visually-hidden">{t("starCount", { n })}</span>
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${base}-body`}>{t("reviewBody")}</label>
      <textarea
        id={`${base}-body`}
        name="body"
        dir="auto"
        rows={3}
        maxLength={MAX_TEXT}
        defaultValue={mine?.body ?? ""}
        placeholder={t("reviewPlaceholder")}
      />
      <div className="cf-form-actions">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t("saving") : mine ? t("updateReview") : t("submitReview")}
        </button>
      </div>
      <FeedbackMessage state={state} success={t("reviewSaved")} />
    </form>
  );
}

export function CourseReviews({
  courseId,
  locale,
  summary,
  reviews,
  access,
  limit,
}: {
  courseId: string;
  locale: Locale;
  summary: CourseFeedbackSummary;
  reviews: CourseReview[];
  access: Access;
  limit: number;
}) {
  const t = useTranslations("courseFeedback");
  const date = useDate();
  const mine = reviews.find((review) => review.isMine);
  const top = Math.max(1, ...summary.ratingCounts);
  return (
    <>
      <h2>{t("reviewsTitle")}</h2>
      {summary.reviewCount > 0 && summary.averageRating !== null && (
        <div className="cf-summary">
          <div className="cf-average">
            <strong dir="ltr">{summary.averageRating.toFixed(1)}</strong>
            <RatingStars rating={summary.averageRating} size={18} />
            <small>{t("reviewsCount", { n: summary.reviewCount })}</small>
          </div>
          <ul className="cf-bars">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = summary.ratingCounts[stars - 1] ?? 0;
              return (
                <li
                  key={stars}
                  aria-label={t("starShare", {
                    stars: t("starCount", { n: stars }),
                    count: String(count),
                  })}
                >
                  <span aria-hidden="true" dir="ltr">
                    {stars} <Star size={13} />
                  </span>
                  <span className="cf-bar" aria-hidden="true">
                    <span style={{ width: `${(count / top) * 100}%` }} />
                  </span>
                  <span aria-hidden="true" dir="ltr">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {access.entitled ? (
        <ReviewForm
          key={mine?.updatedAt ?? "new"}
          courseId={courseId}
          locale={locale}
          mine={mine}
        />
      ) : (
        <AccessNote
          access={access}
          signInKey="signInToReview"
          enrollKey="enrollToReview"
        />
      )}
      {reviews.length === 0 ? (
        <p className="cf-empty">{t("noReviews")}</p>
      ) : (
        <ul className="cf-list">
          {reviews.map((review) => (
            <li key={review.id} className={review.isMine ? "mine" : ""}>
              <div className="cf-item-head">
                <strong dir="auto">
                  {review.isMine ? t("you") : review.authorName || t("learner")}
                </strong>
                <RatingStars rating={review.rating} size={14} />
                <small>
                  {date(review.createdAt)}
                  {review.updatedAt !== review.createdAt && ` · ${t("edited")}`}
                </small>
              </div>
              {review.body && <p dir="auto">{review.body}</p>}
              {review.canRemove && (
                <RemoveButton
                  id={review.id}
                  locale={locale}
                  action={deleteReviewAction}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {reviews.length >= limit && (
        <p className="cf-empty">{t("limitNote", { n: limit })}</p>
      )}
    </>
  );
}

function AnswerForm({
  questionId,
  locale,
  onDone,
}: {
  questionId: string;
  locale: Locale;
  onDone: () => void;
}) {
  const t = useTranslations("courseFeedback");
  const base = useId();
  const [state, formAction, pending] = useActionState<
    FeedbackActionState,
    FormData
  >(answerQuestionAction, {});
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  useEffect(() => {
    if (state.status === "ok") onDone();
  }, [state, onDone]);
  return (
    <form action={formAction} className="cf-form cf-reply">
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor={`${base}-answer`} className="visually-hidden">
        {t("replyLabel")}
      </label>
      <textarea
        ref={ref}
        id={`${base}-answer`}
        name="body"
        dir="auto"
        rows={2}
        required
        maxLength={MAX_TEXT}
        placeholder={t("replyLabel")}
      />
      <div className="cf-form-actions">
        <button type="button" className="btn outline" onClick={onDone}>
          {t("cancel")}
        </button>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t("posting") : t("postAnswer")}
        </button>
      </div>
      <FeedbackMessage state={state} />
    </form>
  );
}

function QuestionItem({
  question,
  locale,
}: {
  question: CourseQuestion;
  locale: Locale;
}) {
  const t = useTranslations("courseFeedback");
  const date = useDate();
  const [replying, setReplying] = useState(false);
  return (
    <li className={question.isMine ? "mine" : ""}>
      <div className="cf-item-head">
        <strong dir="auto">
          {question.isMine ? t("you") : question.authorName || t("learner")}
        </strong>
        <small>{date(question.createdAt)}</small>
      </div>
      <p dir="auto">{question.body}</p>
      <div className="cf-item-actions">
        <span>
          <MessageSquare size={15} aria-hidden="true" />{" "}
          {t("answersCount", { n: question.answers.length })}
        </span>
        {!replying && (
          <button
            type="button"
            className="text-link"
            onClick={() => setReplying(true)}
          >
            {t("reply")}
          </button>
        )}
        {question.canRemove && (
          <RemoveButton
            id={question.id}
            locale={locale}
            action={deleteQuestionAction}
          />
        )}
      </div>
      {question.answers.length > 0 && (
        <ul className="cf-answers">
          {question.answers.map((answer) => (
            <li key={answer.id}>
              <div className="cf-item-head">
                <strong dir="auto">
                  {answer.isMine ? t("you") : answer.authorName || t("learner")}
                </strong>
                {answer.isStaff && <em className="cf-staff">{t("staff")}</em>}
                <small>{date(answer.createdAt)}</small>
              </div>
              <p dir="auto">{answer.body}</p>
              {answer.canRemove && (
                <RemoveButton
                  id={answer.id}
                  locale={locale}
                  action={deleteAnswerAction}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {replying && (
        <AnswerForm
          questionId={question.id}
          locale={locale}
          onDone={() => setReplying(false)}
        />
      )}
    </li>
  );
}

export function CourseQuestions({
  courseId,
  locale,
  questions,
  questionCount,
  access,
  limit,
}: {
  courseId: string;
  locale: Locale;
  questions: CourseQuestion[] | null;
  questionCount: number;
  access: Access;
  limit: number;
}) {
  const t = useTranslations("courseFeedback");
  const base = useId();
  const [state, formAction, pending] = useActionState<
    FeedbackActionState,
    FormData
  >(askQuestionAction, {});
  if (!questions) {
    return (
      <>
        <h2>{t("questionsTitle")}</h2>
        <p className="cf-empty">{t("questionsCount", { n: questionCount })}</p>
        <AccessNote
          access={access}
          signInKey="signInToAsk"
          enrollKey="enrollToAsk"
        />
      </>
    );
  }
  return (
    <>
      <h2>{t("questionsTitle")}</h2>
      <form action={formAction} className="cf-form">
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="locale" value={locale} />
        <label htmlFor={`${base}-question`}>{t("askLabel")}</label>
        <textarea
          id={`${base}-question`}
          name="body"
          dir="auto"
          rows={3}
          required
          maxLength={MAX_TEXT}
          placeholder={t("askPlaceholder")}
        />
        <div className="cf-form-actions">
          <button className="btn" type="submit" disabled={pending}>
            {pending ? t("posting") : t("postQuestion")}
          </button>
        </div>
        <FeedbackMessage state={state} success={t("questionPosted")} />
      </form>
      {questions.length === 0 ? (
        <p className="cf-empty">{t("noQuestions")}</p>
      ) : (
        <ul className="cf-list">
          {questions.map((question) => (
            <QuestionItem
              key={question.id}
              question={question}
              locale={locale}
            />
          ))}
        </ul>
      )}
      {questions.length >= limit && (
        <p className="cf-empty">{t("limitNote", { n: limit })}</p>
      )}
    </>
  );
}
