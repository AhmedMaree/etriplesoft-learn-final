// Shapes shared by the AI assistant route handlers and the client page.

/** General: Odoo tutor without course material. Course: answers from one course's indexed content (RAG). */
export type ChatKind = "general" | "course";

/** A citation under a Course chat reply; refs are the [n] markers the reply uses. */
export type ChatSource = {
  refs: number[];
  lessonId: string | null;
  courseSlug: string;
  label: string;
  video: boolean;
  document?: boolean;
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "complete" | "stopped";
  createdAt: string;
  sources?: ChatSource[];
};

/** A course the signed-in learner may attach as context: an active or completed, unexpired enrollment. */
export type ContextCourse = { id: string; slug: string; title: string; required: number; finished: number };

export type ConversationSummary = {
  id: string;
  kind: ChatKind;
  courseId: string | null;
  title: string;
  preview: string;
  updatedAt: string;
};

export type AssistantInsights = {
  questions: number;
  questionsThisWeek: number;
  questionsLastWeek: number;
  conversations: number;
  sessions: number;
};

/** Newline-delimited JSON events streamed by POST /api/ai/chat. */
export type ChatStreamEvent =
  | { type: "start"; conversationId: string; created: boolean; userMessageId: string }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "delta"; text: string }
  | { type: "title"; title: string }
  | { type: "done"; messageId: string; status: "complete" | "stopped"; fallback: boolean }
  | { type: "error"; code: ChatErrorCode };

export type ChatErrorCode =
  | "authentication"
  | "configuration"
  | "input"
  | "context"
  | "notFound"
  | "rateMinute"
  | "rateDaily"
  | "rateDeep"
  | "conversationFull"
  | "provider"
  | "busy"
  | "blocked"
  | "unavailable";
