export const NOTIFICATION_KINDS = [
  "enrollment_started",
  "course_completed",
  "certificate_issued",
  "quiz_passed",
  "quiz_failed",
  "event_scheduled",
  "event_cancelled",
  "event_reminder",
  "deadline_reminder",
  "streak_reminder",
  "streak_milestone",
  "message_received",
  "message_from_learner",
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type LearnerNotification = {
  id: string;
  kind: NotificationKind;
  createdAt: string;
  read: boolean;
  courseSlug: string | null;
  /** Exact-locale published title, or null (the UI then uses a generic phrase). */
  courseTitle: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  eventKind: string | null;
  eventTitle: string | null;
  eventStartsAt: string | null;
  certificateId: string | null;
  score: number | null;
  possible: number | null;
  days: number | null;
  /** Message notifications link to their conversation. */
  threadId: string | null;
};
