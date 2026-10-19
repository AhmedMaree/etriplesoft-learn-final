import "server-only";
import type { Locale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_KINDS,
  type LearnerNotification,
  type NotificationKind,
} from "../types";

const KINDS: readonly string[] = NOTIFICATION_KINDS;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Creates any due reminders the learner opted into (idempotent), then returns the unread count.
 * A failed sync never hides the inbox; the count is still read.
 */
export async function syncAndCountNotifications(): Promise<number> {
  const client = await createClient();
  await client.rpc("learner_sync_notifications");
  const { data, error } = await client.rpc("learner_unread_notification_count");
  return error || typeof data !== "number" ? 0 : data;
}

export async function listNotifications(
  locale: Locale,
  limit = 20,
): Promise<LearnerNotification[]> {
  const { data, error } = await (
    await createClient()
  ).rpc("learner_list_notifications", { p_locale: locale, p_limit: limit });
  if (error) throw new Error("Notifications unavailable.");
  return (data ?? [])
    .filter((row) => KINDS.includes(row.kind))
    .map((row) => {
      const values =
        row.data && typeof row.data === "object" && !Array.isArray(row.data)
          ? row.data
          : {};
      return {
        id: row.id,
        kind: row.kind as NotificationKind,
        createdAt: row.created_at,
        read: Boolean(row.read_at),
        courseSlug: row.course_slug ?? null,
        courseTitle: row.course_title ?? null,
        lessonId: row.lesson_id ?? null,
        lessonTitle: row.lesson_title ?? null,
        eventKind: row.event_kind ?? null,
        eventTitle: row.event_title ?? null,
        eventStartsAt: row.event_starts_at ?? null,
        certificateId: row.certificate_id ?? null,
        score: number(values.score),
        possible: number(values.possible),
        days: number(values.days),
        threadId:
          typeof values.threadId === "string" && UUID_PATTERN.test(values.threadId)
            ? values.threadId
            : null,
      };
    });
}
