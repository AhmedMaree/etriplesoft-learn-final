"use server";
import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";
import type { LearnerNotification } from "../types";
import { listNotifications, syncAndCountNotifications } from "./notifications";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every call runs with the learner's own session; the database scopes reads and writes to the caller.
export async function loadNotificationsAction(): Promise<
  { items: LearnerNotification[]; unread: number } | { error: true }
> {
  const locale = await getLocale();
  if (!isLocale(locale)) return { error: true };
  try {
    const unread = await syncAndCountNotifications();
    return { items: await listNotifications(locale), unread };
  } catch {
    return { error: true };
  }
}

export async function unreadNotificationsAction(): Promise<number | null> {
  try {
    return await syncAndCountNotifications();
  } catch {
    return null;
  }
}

/** `ids` null marks every notification read. */
export async function markNotificationsReadAction(
  ids: string[] | null,
): Promise<boolean> {
  if (
    ids !== null &&
    (!ids.length ||
      ids.length > 100 ||
      !ids.every((id) => UUID_PATTERN.test(id)))
  )
    return false;
  const { error } = await (
    await createClient()
  ).rpc("learner_mark_notifications_read", ids ? { p_ids: ids } : {});
  return !error;
}
