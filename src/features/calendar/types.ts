export const COURSE_EVENT_KINDS = [
  "live_session",
  "office_hours",
  "workshop",
  "deadline",
  "quiz",
] as const;
export type CourseEventKind = (typeof COURSE_EVENT_KINDS)[number];
export type CalendarEventKind = CourseEventKind | "study";

export type CalendarEvent = {
  id: string;
  source: "course" | "personal";
  kind: CalendarEventKind;
  status: "scheduled" | "cancelled";
  /** Exact-locale title; null when the event has none in this language (the UI shows the kind). */
  title: string | null;
  description: string | null;
  courseSlug: string | null;
  courseTitle: string | null;
  lessonId: string | null;
  startsAt: string;
  endsAt: string | null;
  meetingUrl: string | null;
};

export type LearningStreak = {
  current: number;
  longest: number;
  totalDays: number;
  today: string;
  activeToday: boolean;
  week: { date: string; active: boolean }[];
};

/** A due moment rather than a time slot. */
export const isDueKind = (kind: CalendarEventKind) =>
  kind === "deadline" || kind === "quiz";
