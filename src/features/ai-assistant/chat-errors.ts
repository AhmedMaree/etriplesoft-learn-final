import type { ChatErrorCode } from "@/features/ai-assistant/types";

/** Message key (in the "ai" namespace) shown for each error code returned by POST /api/ai/chat. */
export const ERROR_KEYS: Record<ChatErrorCode, string> = {
  authentication: "errorAuthentication",
  configuration: "unavailableTitle",
  input: "errorGeneric",
  context: "errorContext",
  notFound: "errorNotFound",
  rateMinute: "errorRateMinute",
  rateDaily: "errorRateDaily",
  rateDeep: "errorRateDeep",
  conversationFull: "errorConversationFull",
  provider: "errorGeneric",
  busy: "errorBusy",
  blocked: "errorBlocked",
  unavailable: "errorGeneric",
};

export function readErrorCode(value: unknown): ChatErrorCode {
  const code = value && typeof value === "object" ? Reflect.get(value, "error") : null;
  return typeof code === "string" && code in ERROR_KEYS ? (code as ChatErrorCode) : "unavailable";
}
