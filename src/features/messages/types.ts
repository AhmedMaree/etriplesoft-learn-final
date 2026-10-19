export const MESSAGE_BOXES = ["mine", "staff"] as const;
export type MessageBox = (typeof MESSAGE_BOXES)[number];

export const THREAD_FILTERS = [
  "all",
  "unread",
  "open",
  "awaiting",
  "closed",
] as const;
export type ThreadFilter = (typeof THREAD_FILTERS)[number];

export type ThreadTopic = "course" | "support";
export type ThreadStatus = "open" | "closed";

export const SUBJECT_MAX = 160;
export const BODY_MAX = 4000;
export const SEARCH_MAX = 100;
export const THREAD_PAGE_SIZE = 30;
export const MESSAGE_PAGE_SIZE = 50;

export type InboxSummary = {
  isStaff: boolean;
  unreadMine: number;
  unreadStaff: number;
};

export type ThreadSummary = {
  id: string;
  topic: ThreadTopic;
  courseSlug: string | null;
  /** Exact-locale published title, or null (the UI then uses a generic phrase). */
  courseTitle: string | null;
  subject: string;
  status: ThreadStatus;
  /** Staff box only. */
  learnerName: string | null;
  createdAt: string;
  lastMessageAt: string;
  lastBody: string;
  lastFromMe: boolean;
  lastIsStaff: boolean;
  unread: number;
};

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  isStaff: boolean;
  senderName: string | null;
};

export type ThreadDetail = {
  id: string;
  topic: ThreadTopic;
  subject: string;
  status: ThreadStatus;
  createdAt: string;
  closedAt: string | null;
  courseSlug: string | null;
  courseTitle: string | null;
  learnerName: string | null;
  viewerRole: "learner" | "staff";
  otherReadAt: string | null;
  hasMore: boolean;
  messages: ThreadMessage[];
};

export type CourseOption = {
  id: string;
  slug: string;
  title: string;
  instructors: string[];
};
