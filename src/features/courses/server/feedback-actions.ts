"use server";

import { revalidatePath } from "next/cache";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

// Learner writes for course reviews and Q&A. Inputs are re-validated here for friendly errors; the
// database functions remain the authority on identity, enrollment, limits and moderation rights.

export type FeedbackActionState = {
  status?: "ok" | "error";
  error?: "signIn" | "notAllowed" | "invalid" | "rateLimited" | "unexpected";
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT = 2000;

const text = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";
const uuid = (value: FormDataEntryValue | null) => {
  const id = text(value);
  return UUID_PATTERN.test(id) ? id : null;
};

function failure(error: { code?: string } | null): FeedbackActionState {
  if (error?.code === "42501") return { status: "error", error: "notAllowed" };
  if (error?.code === "54000") return { status: "error", error: "rateLimited" };
  if (error?.code === "22023" || error?.code === "P0002")
    return { status: "error", error: "invalid" };
  return { status: "error", error: "unexpected" };
}

async function run(
  localeValue: FormDataEntryValue | null,
  call: (
    client: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ error: { code?: string } | null }>,
): Promise<FeedbackActionState> {
  const locale = text(localeValue);
  if (!isLocale(locale)) return { status: "error", error: "invalid" };
  const client = await createClient();
  const { data } = await client.auth.getUser();
  if (!data.user) return { status: "error", error: "signIn" };
  const { error } = await call(client);
  if (error) return failure(error);
  revalidatePath(`/${locale}/courses`);
  return { status: "ok" };
}

export async function saveReviewAction(
  _: FeedbackActionState,
  form: FormData,
): Promise<FeedbackActionState> {
  const courseId = uuid(form.get("courseId"));
  const rating = Number(text(form.get("rating")));
  const body = text(form.get("body"));
  const locale = text(form.get("locale"));
  if (
    !courseId ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    body.length > MAX_TEXT ||
    !isLocale(locale)
  ) {
    return { status: "error", error: "invalid" };
  }
  return run(locale, (client) =>
    client.rpc("learner_save_course_review", {
      p_course_id: courseId,
      p_rating: rating,
      p_body: body,
      p_locale: locale,
    }),
  );
}

export async function deleteReviewAction(
  _: FeedbackActionState,
  form: FormData,
): Promise<FeedbackActionState> {
  const id = uuid(form.get("id"));
  if (!id) return { status: "error", error: "invalid" };
  return run(form.get("locale"), (client) =>
    client.rpc("learner_delete_course_review", { p_review_id: id }),
  );
}

export async function askQuestionAction(
  _: FeedbackActionState,
  form: FormData,
): Promise<FeedbackActionState> {
  const courseId = uuid(form.get("courseId"));
  const body = text(form.get("body"));
  const locale = text(form.get("locale"));
  if (!courseId || !body || body.length > MAX_TEXT || !isLocale(locale))
    return { status: "error", error: "invalid" };
  return run(locale, (client) =>
    client.rpc("learner_ask_course_question", {
      p_course_id: courseId,
      p_body: body,
      p_locale: locale,
    }),
  );
}

export async function answerQuestionAction(
  _: FeedbackActionState,
  form: FormData,
): Promise<FeedbackActionState> {
  const questionId = uuid(form.get("questionId"));
  const body = text(form.get("body"));
  if (!questionId || !body || body.length > MAX_TEXT)
    return { status: "error", error: "invalid" };
  return run(form.get("locale"), (client) =>
    client.rpc("learner_answer_course_question", {
      p_question_id: questionId,
      p_body: body,
    }),
  );
}

export async function deleteQuestionAction(
  _: FeedbackActionState,
  form: FormData,
): Promise<FeedbackActionState> {
  const id = uuid(form.get("id"));
  if (!id) return { status: "error", error: "invalid" };
  return run(form.get("locale"), (client) =>
    client.rpc("learner_delete_course_question", { p_question_id: id }),
  );
}

export async function deleteAnswerAction(
  _: FeedbackActionState,
  form: FormData,
): Promise<FeedbackActionState> {
  const id = uuid(form.get("id"));
  if (!id) return { status: "error", error: "invalid" };
  return run(form.get("locale"), (client) =>
    client.rpc("learner_delete_course_answer", { p_answer_id: id }),
  );
}
