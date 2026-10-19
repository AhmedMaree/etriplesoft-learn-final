import "server-only";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import {
  THREAD_PAGE_SIZE,
  MESSAGE_PAGE_SIZE,
  type CourseOption,
  type InboxSummary,
  type MessageBox,
  type ThreadDetail,
  type ThreadFilter,
  type ThreadMessage,
  type ThreadSummary,
} from "../types";

// Every read runs with the caller's own session; the database decides what they may see.

const text = (value: unknown) => (typeof value === "string" ? value : null);
const count = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export async function getInboxSummary(): Promise<InboxSummary> {
  const { data, error } = await (
    await createClient()
  ).rpc("messages_inbox_summary");
  const v =
    !error && data && typeof data === "object" && !Array.isArray(data)
      ? data
      : {};
  return {
    isStaff: v.isStaff === true,
    unreadMine: count(v.unreadMine),
    unreadStaff: count(v.unreadStaff),
  };
}

/** Returns one page plus whether another page exists. */
export async function listThreads(
  locale: Locale,
  box: MessageBox,
  filter: ThreadFilter,
  search: string,
  offset = 0,
): Promise<{ threads: ThreadSummary[]; hasMore: boolean }> {
  const { data, error } = await (
    await createClient()
  ).rpc("messages_list_threads", {
    p_box: box,
    p_filter: filter,
    p_search: search,
    p_locale: locale,
    p_limit: THREAD_PAGE_SIZE + 1,
    p_offset: offset,
  });
  if (error) throw new Error("Conversations unavailable.");
  const rows = data ?? [];
  return {
    hasMore: rows.length > THREAD_PAGE_SIZE,
    threads: rows.slice(0, THREAD_PAGE_SIZE).map((row) => ({
      id: row.id,
      topic: row.topic === "course" ? "course" : "support",
      courseSlug: row.course_slug ?? null,
      courseTitle: row.course_title ?? null,
      subject: row.subject,
      status: row.status === "closed" ? "closed" : "open",
      learnerName: row.learner_name ?? null,
      createdAt: row.created_at,
      lastMessageAt: row.last_message_at,
      lastBody: row.last_body ?? "",
      lastFromMe: Boolean(row.last_from_me),
      lastIsStaff: Boolean(row.last_is_staff),
      unread: count(row.unread_count),
    })),
  };
}

function toMessage(value: unknown): ThreadMessage | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const id = text(v.id);
  const body = text(v.body);
  const createdAt = text(v.createdAt);
  if (!id || body === null || !createdAt) return null;
  return {
    id,
    body,
    createdAt,
    mine: v.mine === true,
    isStaff: v.isStaff === true,
    senderName: text(v.senderName),
  };
}

/** Null when the conversation does not exist or the caller may not see it. */
export async function getThread(
  locale: Locale,
  id: string,
  before?: string,
): Promise<ThreadDetail | null> {
  const { data, error } = await (
    await createClient()
  ).rpc("messages_get_thread", {
    p_thread_id: id,
    p_locale: locale,
    p_limit: MESSAGE_PAGE_SIZE,
    ...(before ? { p_before: before } : {}),
  });
  if (error) {
    if (error.code === "P0002") return null;
    throw new Error("Conversation unavailable.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const v = data as Record<string, unknown>;
  const threadId = text(v.id);
  const subject = text(v.subject);
  const createdAt = text(v.createdAt);
  if (!threadId || !subject || !createdAt) return null;
  return {
    id: threadId,
    topic: v.topic === "course" ? "course" : "support",
    subject,
    status: v.status === "closed" ? "closed" : "open",
    createdAt,
    closedAt: text(v.closedAt),
    courseSlug: text(v.courseSlug),
    courseTitle: text(v.courseTitle),
    learnerName: text(v.learnerName),
    viewerRole: v.viewerRole === "staff" ? "staff" : "learner",
    otherReadAt: text(v.otherReadAt),
    hasMore: v.hasMore === true,
    messages: (Array.isArray(v.messages) ? v.messages : [])
      .map(toMessage)
      .filter((m): m is ThreadMessage => m !== null),
  };
}

export async function listCourseOptions(
  locale: Locale,
): Promise<CourseOption[]> {
  const { data, error } = await (
    await createClient()
  ).rpc("messages_list_course_options", { p_locale: locale });
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    instructors: row.instructors ?? [],
  }));
}
