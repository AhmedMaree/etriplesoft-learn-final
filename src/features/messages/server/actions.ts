"use server";
import { getLocale } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import {
  BODY_MAX,
  MESSAGE_BOXES,
  SEARCH_MAX,
  SUBJECT_MAX,
  THREAD_FILTERS,
  type InboxSummary,
  type MessageBox,
  type ThreadDetail,
  type ThreadFilter,
  type ThreadSummary,
} from "../types";
import { getInboxSummary, getThread, listThreads } from "./messages";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MessageError =
  "invalid" | "closed" | "limit" | "notFound" | "failed";

// Every call runs with the caller's own session; the database checks who may read or write.
function errorOf(code: string | undefined): MessageError {
  switch (code) {
    case "22023":
      return "invalid";
    case "55000":
      return "closed";
    case "54000":
      return "limit";
    case "P0002":
    case "42501":
      return "notFound";
    default:
      return "failed";
  }
}

async function currentLocale(): Promise<Locale | null> {
  const locale = await getLocale();
  return isLocale(locale) ? locale : null;
}

export async function loadThreadsAction(
  box: MessageBox,
  filter: ThreadFilter,
  search: string,
  offset = 0,
): Promise<
  | { threads: ThreadSummary[]; hasMore: boolean; summary: InboxSummary }
  | { error: MessageError }
> {
  const locale = await currentLocale();
  const query = String(search ?? "").trim();
  if (
    !locale ||
    !MESSAGE_BOXES.includes(box) ||
    !THREAD_FILTERS.includes(filter) ||
    query.length > SEARCH_MAX ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 10_000
  )
    return { error: "invalid" };
  try {
    const [page, summary] = await Promise.all([
      listThreads(locale, box, filter, query, offset),
      getInboxSummary(),
    ]);
    return { ...page, summary };
  } catch {
    return { error: "failed" };
  }
}

export async function loadThreadAction(
  id: string,
  before?: string,
): Promise<{ thread: ThreadDetail } | { error: MessageError }> {
  const locale = await currentLocale();
  if (
    !locale ||
    !UUID_PATTERN.test(id) ||
    (before !== undefined && Number.isNaN(Date.parse(before)))
  )
    return { error: "invalid" };
  try {
    const thread = await getThread(locale, id, before);
    return thread ? { thread } : { error: "notFound" };
  } catch {
    return { error: "failed" };
  }
}

export async function markThreadReadAction(id: string): Promise<boolean> {
  if (!UUID_PATTERN.test(id)) return false;
  const { error } = await (
    await createClient()
  ).rpc("messages_mark_thread_read", { p_thread_id: id });
  return !error;
}

export async function sendMessageAction(
  threadId: string,
  body: string,
): Promise<{ id: string } | { error: MessageError }> {
  const text = String(body ?? "").trim();
  if (!UUID_PATTERN.test(threadId) || !text || text.length > BODY_MAX)
    return { error: "invalid" };
  const { data, error } = await (
    await createClient()
  ).rpc("messages_send", { p_thread_id: threadId, p_body: text });
  if (error || typeof data !== "string") return { error: errorOf(error?.code) };
  return { id: data };
}

export async function startThreadAction(input: {
  topic: string;
  courseId: string | null;
  subject: string;
  body: string;
}): Promise<{ id: string } | { error: MessageError }> {
  const subject = String(input.subject ?? "").trim();
  const body = String(input.body ?? "").trim();
  const course = input.topic === "course" ? input.courseId : null;
  if (
    (input.topic !== "course" && input.topic !== "support") ||
    (input.topic === "course" && (!course || !UUID_PATTERN.test(course))) ||
    !subject ||
    subject.length > SUBJECT_MAX ||
    !body ||
    body.length > BODY_MAX
  )
    return { error: "invalid" };
  const { data, error } = await (
    await createClient()
  ).rpc("messages_start_thread", {
    p_topic: input.topic,
    // The generated type marks this argument required; the database accepts NULL for support.
    p_course_id: course as string,
    p_subject: subject,
    p_body: body,
  });
  if (error || typeof data !== "string") return { error: errorOf(error?.code) };
  return { id: data };
}

export async function setThreadStatusAction(
  id: string,
  status: "open" | "closed",
): Promise<{ ok: true } | { error: MessageError }> {
  if (!UUID_PATTERN.test(id) || (status !== "open" && status !== "closed"))
    return { error: "invalid" };
  const { error } = await (
    await createClient()
  ).rpc("messages_set_thread_status", { p_thread_id: id, p_status: status });
  return error ? { error: errorOf(error.code) } : { ok: true };
}
