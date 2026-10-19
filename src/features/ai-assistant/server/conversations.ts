import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AssistantInsights, AssistantMessage, ChatSource, ConversationSummary } from "../types";

// Reads go through the caller's client, so RLS limits every row to the signed-in owner.
type Client = SupabaseClient<Database>;

export const CONVERSATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY_LIMIT = 50;
const MESSAGE_LIMIT = 200;

export async function listConversations(client: Client): Promise<ConversationSummary[]> {
  const { data, error } = await client
    .from("ai_conversations")
    .select("id, kind, course_id, title, preview, updated_at")
    .order("updated_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw new Error("Conversations unavailable.");
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind === "course" ? "course" : "general",
    courseId: row.course_id,
    title: row.title,
    preview: row.preview,
    updatedAt: row.updated_at,
  }));
}

function readSources(value: unknown): ChatSource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const sources = value.flatMap((item): ChatSource[] => {
    if (!item || typeof item !== "object") return [];
    const refs = Reflect.get(item, "refs");
    const lessonId = Reflect.get(item, "lessonId");
    const courseSlug = Reflect.get(item, "courseSlug");
    const label = Reflect.get(item, "label");
    if (!Array.isArray(refs) || !refs.every((n) => Number.isInteger(n)) || typeof courseSlug !== "string" || typeof label !== "string") return [];
    if (lessonId !== null && (typeof lessonId !== "string" || !CONVERSATION_ID_PATTERN.test(lessonId))) return [];
    return [{ refs, lessonId, courseSlug, label, video: Reflect.get(item, "video") === true, document: Reflect.get(item, "document") === true }];
  });
  return sources.length ? sources : undefined;
}

function toMessage(row: { id: string; role: string; content: string; status: string; created_at: string; sources: unknown }): AssistantMessage {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    status: row.status === "stopped" ? "stopped" : "complete",
    createdAt: row.created_at,
    sources: readSources(row.sources),
  };
}

/** Messages of one owned conversation, oldest first; null when it does not exist for this caller. */
export async function getConversationMessages(client: Client, conversationId: string): Promise<AssistantMessage[] | null> {
  if (!CONVERSATION_ID_PATTERN.test(conversationId)) return null;
  const { data: conversation, error: conversationError } = await client
    .from("ai_conversations")
    .select("id")
    .eq("id", conversationId)
    .maybeSingle();
  if (conversationError) throw new Error("Conversation unavailable.");
  if (!conversation) return null;
  const { data, error } = await client
    .from("ai_messages")
    .select("id, role, content, status, created_at, sources")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(MESSAGE_LIMIT);
  if (error) throw new Error("Conversation unavailable.");
  return (data ?? []).map(toMessage);
}

/** The most recent messages for model memory, oldest first. */
export async function getRecentMessages(client: Client, conversationId: string, limit: number): Promise<AssistantMessage[]> {
  const { data, error } = await client
    .from("ai_messages")
    .select("id, role, content, status, created_at, sources")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Conversation unavailable.");
  return (data ?? []).map(toMessage).reverse();
}

export async function deleteConversation(client: Client, conversationId: string): Promise<boolean> {
  if (!CONVERSATION_ID_PATTERN.test(conversationId)) return false;
  const { data, error } = await client.from("ai_conversations").delete().eq("id", conversationId).select("id");
  if (error) throw new Error("Conversation could not be deleted.");
  return (data ?? []).length > 0;
}

const EMPTY_INSIGHTS: AssistantInsights = { questions: 0, questionsThisWeek: 0, questionsLastWeek: 0, conversations: 0, sessions: 0 };

export async function getInsights(client: Client): Promise<AssistantInsights> {
  const { data, error } = await client.rpc("learner_ai_insights");
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return EMPTY_INSIGHTS;
  const read = (key: keyof AssistantInsights) => {
    const value = Reflect.get(data, key);
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  };
  return {
    questions: read("questions"),
    questionsThisWeek: read("questionsThisWeek"),
    questionsLastWeek: read("questionsLastWeek"),
    conversations: read("conversations"),
    sessions: read("sessions"),
  };
}
