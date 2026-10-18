export type QuizQuestion = {
  id: string;
  type: "single" | "multiple" | "true_false";
  prompt: string;
  options: { id: string; label: string }[];
};
export type QuizState = {
  versionId: string;
  title: string;
  instructions: string;
  passPercent: number;
  maxAttempts: number;
  durationSeconds: number;
  serverNow: string;
  attemptsUsed: number;
  adminPreview?: boolean;
  questions: QuizQuestion[];
  attempt: null | {
    id: string;
    number: number;
    status: "active" | "submitted" | "timed_out";
    deadline: string;
    score: number | null;
    possibleScore: number | null;
    passed: boolean | null;
    sequence: number;
    answers: Record<string, string[]>;
  };
  review:
    | null
    | { questionId: string; correctOptions: string[]; explanation: string }[];
};
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

/** Validate the RPC/HTTP boundary rather than casting arbitrary JSON to application state. */
export function isQuizState(value: unknown): value is QuizState {
  if (
    !record(value) ||
    typeof value.versionId !== "string" ||
    typeof value.title !== "string" ||
    typeof value.instructions !== "string" ||
    typeof value.serverNow !== "string" ||
    !Number.isFinite(Date.parse(value.serverNow)) ||
    !["passPercent", "maxAttempts", "durationSeconds", "attemptsUsed"].every(
      (key) => typeof value[key] === "number",
    ) ||
    !Array.isArray(value.questions) ||
    (value.adminPreview !== undefined && typeof value.adminPreview !== "boolean") ||
    !value.questions.every(
      (q) =>
        record(q) &&
        typeof q.id === "string" &&
        typeof q.prompt === "string" &&
        ["single", "multiple", "true_false"].includes(String(q.type)) &&
        Array.isArray(q.options) &&
        q.options.every(
          (o) =>
            record(o) &&
            typeof o.id === "string" &&
            typeof o.label === "string",
        ),
    )
  )
    return false;
  if (value.attempt !== null) {
    const a = value.attempt;
    if (
      !record(a) ||
      typeof a.id !== "string" ||
      typeof a.number !== "number" ||
      !["active", "submitted", "timed_out"].includes(String(a.status)) ||
      typeof a.deadline !== "string" ||
      !Number.isFinite(Date.parse(a.deadline)) ||
      typeof a.sequence !== "number" ||
      !record(a.answers) ||
      !Object.values(a.answers).every(strings) ||
      !(a.score === null || typeof a.score === "number") ||
      !(a.possibleScore === null || typeof a.possibleScore === "number") ||
      !(a.passed === null || typeof a.passed === "boolean")
    )
      return false;
  }
  if (value.adminPreview === true && value.attempt !== null) return false;
  return (
    value.review === null ||
    (Array.isArray(value.review) &&
      value.review.every(
        (r) =>
          record(r) &&
          typeof r.questionId === "string" &&
          strings(r.correctOptions) &&
          typeof r.explanation === "string",
      ))
  );
}
