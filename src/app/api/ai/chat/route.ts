import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { readBoundedJson } from "@/lib/http/bounded-json";
import { hasTrustedRequestOrigin } from "@/lib/http/trusted-origin";
import { createClient } from "@/lib/supabase/server";
import { COURSE_SLUG_PATTERN } from "@/features/courses/server/course-repository";
import {
  buildSystemPrompt,
  loadCatalogDigest,
  loadCourseContext,
  replyLanguage,
  type AssistantMode,
} from "@/features/ai-assistant/server/context";
import { CONVERSATION_ID_PATTERN, getRecentMessages } from "@/features/ai-assistant/server/conversations";
import {
  GeminiError,
  generateGeminiText,
  geminiModel,
  isGeminiConfigured,
  streamGemini,
  type GeminiThinkingLevel,
  type GeminiTurn,
} from "@/features/ai-assistant/server/gemini";
import { citedSources, excerptSources, retrieveCourseExcerpts, type RetrievedExcerpt } from "@/features/ai-assistant/server/rag";
import type { ChatErrorCode, ChatKind, ChatSource, ChatStreamEvent } from "@/features/ai-assistant/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BODY_BYTES = 16_384;
const MAX_QUESTION_CHARS = 4000;
const MAX_REPLY_CHARS = 32_000;
// Every turn re-sends this history, so it is the main input cost of a long conversation (about five exchanges).
const HISTORY_MESSAGES = 10;
const TITLE_TIMEOUT_MS = 10_000;
const OUTPUT_TOKENS = { fast: 8192, deep: 16384 } as const;

const fail = (code: ChatErrorCode, status: number) =>
  NextResponse.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });

type ChatInput = {
  locale: "en" | "ar";
  kind: ChatKind;
  message: string;
  conversationId: string | null;
  courseSlug: string | null;
  mode: AssistantMode;
};

function parseInput(value: unknown): ChatInput | null {
  if (!value || typeof value !== "object") return null;
  const locale = Reflect.get(value, "locale");
  const message = Reflect.get(value, "message");
  const conversationId = Reflect.get(value, "conversationId") ?? null;
  const courseSlug = Reflect.get(value, "courseSlug") ?? null;
  const mode = Reflect.get(value, "mode") ?? "fast";
  const kind = Reflect.get(value, "kind") ?? "general";
  if (typeof locale !== "string" || !isLocale(locale)) return null;
  if (typeof message !== "string" || !message.trim() || message.length > MAX_QUESTION_CHARS) return null;
  if (conversationId !== null && (typeof conversationId !== "string" || !CONVERSATION_ID_PATTERN.test(conversationId))) return null;
  if (courseSlug !== null && (typeof courseSlug !== "string" || !COURSE_SLUG_PATTERN.test(courseSlug))) return null;
  if (mode !== "fast" && mode !== "deep") return null;
  if (kind !== "general" && kind !== "course") return null;
  // Course chat answers from one course's material; General chat never receives course material.
  if (kind === "course" && courseSlug === null) return null;
  return { locale, kind, message: message.trim(), conversationId, courseSlug: kind === "course" ? courseSlug : null, mode };
}

/** Gemini expects alternating turns that start with the learner; merge any repeated roles. */
function toTurns(messages: { role: "user" | "assistant"; content: string }[]): GeminiTurn[] {
  const turns: GeminiTurn[] = [];
  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";
    const last = turns.at(-1);
    if (last?.role === role) last.text += `\n\n${message.content}`;
    else if (turns.length > 0 || role === "user") turns.push({ role, text: message.content });
  }
  return turns;
}

function beginTurnError(error: { code: string; message: string }): Response {
  if (error.code === "54000") {
    if (error.message.includes("ai_rate_daily")) return fail("rateDaily", 429);
    if (error.message.includes("ai_rate_deep")) return fail("rateDeep", 429);
    if (error.message.includes("ai_conversation_full")) return fail("conversationFull", 409);
    return fail("rateMinute", 429);
  }
  if (error.code === "P0002") return fail("notFound", 404);
  if (error.code === "42501") return fail("context", 403);
  if (error.code === "22023") return fail("input", 400);
  return fail("unavailable", 503);
}

export async function POST(request: Request) {
  if (!hasTrustedRequestOrigin(request)) return fail("input", 403);
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return fail("input", 413);
  let input: ChatInput | null;
  try {
    input = parseInput(await readBoundedJson(request, MAX_BODY_BYTES));
  } catch {
    return fail("input", 400);
  }
  if (!input) return fail("input", 400);
  if (!isGeminiConfigured()) return fail("configuration", 503);

  const client = await createClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return fail("authentication", 401);

  const [course, catalog, profile] = await Promise.all([
    input.courseSlug ? loadCourseContext(client, input.locale, input.courseSlug).catch(() => null) : Promise.resolve(null),
    input.kind === "general" ? loadCatalogDigest(client, input.locale) : Promise.resolve(""),
    client.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
  ]);
  if (input.courseSlug && !course) return fail("context", 403);

  const { data: turn, error: turnError } = await client.rpc("learner_ai_begin_turn", {
    p_conversation_id: input.conversationId ?? undefined,
    p_course_id: course?.courseId,
    p_locale: input.locale,
    p_content: input.message,
    p_kind: input.kind,
    p_mode: input.mode,
  });
  if (turnError) return beginTurnError(turnError);
  const started = turn?.[0];
  if (!started) return fail("unavailable", 503);

  let history: GeminiTurn[];
  try {
    history = toTurns(await getRecentMessages(client, started.conversation_id, HISTORY_MESSAGES));
  } catch {
    history = [{ role: "user", text: input.message }];
  }
  // Retrieval query: the question plus the previous learner message, so short follow-ups ("and in
  // Arabic?", "give an example") still find the passage the conversation is about.
  const learnerTurns = history.filter((turn) => turn.role === "user").map((turn) => turn.text);
  const retrievalQuery = learnerTurns.slice(-2).join("\n");
  const { mode, message, kind } = input;
  // Fallback chain for keys without access or quota (free-tier quotas are per model and per day, so a
  // busy model does not block the others). Deep mode keeps a high thinking level on every fallback.
  const level: GeminiThinkingLevel = mode === "deep" ? "high" : "low";
  const attempts: { model: string; thinkingLevel: GeminiThinkingLevel }[] = [
    ...(mode === "deep" ? [{ model: geminiModel("deep"), thinkingLevel: level }] : []),
    { model: geminiModel("chat"), thinkingLevel: level },
    { model: geminiModel("light"), thinkingLevel: level },
  ].filter((attempt, index, all) => all.findIndex((other) => other.model === attempt.model) === index);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: ChatStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };
      send({ type: "start", conversationId: started.conversation_id, created: started.created, userMessageId: started.message_id });

      let excerpts: RetrievedExcerpt[] = [];
      let sources: ChatSource[] = [];
      if (kind === "course" && course) {
        try {
          excerpts = await retrieveCourseExcerpts(client, course.courseId, retrievalQuery, request.signal);
        } catch (error) {
          if (!request.signal.aborted)
            send({ type: "error", code: error instanceof Error && error.message === "access" ? "context" : "provider" });
          if (open) controller.close();
          return;
        }
        sources = excerptSources(excerpts, course.slug, course.lessonTitles);
        if (sources.length) send({ type: "sources", sources });
      }
      const system = buildSystemPrompt({
        locale: input.locale,
        replyLanguage: replyLanguage(message, input.locale),
        kind,
        mode,
        learnerName: profile.data?.display_name ?? null,
        course,
        excerpts,
        catalog,
      });

      let reply = "";
      let status: "complete" | "stopped" = "complete";
      let usage: { input: number; output: number } | null = null;
      let usedModel = attempts[0].model;
      let failure: ChatErrorCode | null = null;
      for (const [index, { model, thinkingLevel }] of attempts.entries()) {
        usedModel = model;
        try {
          for await (const chunk of streamGemini({ model, system, turns: history, maxOutputTokens: OUTPUT_TOKENS[mode], thinkingLevel, signal: request.signal })) {
            if (chunk.usage) usage = chunk.usage;
            if (chunk.finishReason === "MAX_TOKENS") status = "stopped";
            if (!chunk.text) continue;
            const room = MAX_REPLY_CHARS - reply.length;
            const text = chunk.text.slice(0, room);
            reply += text;
            send({ type: "delta", text });
            if (room <= chunk.text.length) {
              status = "stopped";
              break;
            }
          }
          failure = null;
          break;
        } catch (error) {
          if (request.signal.aborted) {
            status = "stopped";
            failure = null;
            break;
          }
          const code = error instanceof GeminiError ? error.code : "unavailable";
          failure = code === "blocked" ? "blocked" : code === "rate" ? "busy" : "provider";
          // A deep model without access or quota for this key (404/403/429): try the next attempt before any output.
          const retry = code === "model" || code === "configuration" || code === "rate";
          if (reply || !retry || index === attempts.length - 1) break;
        }
      }
      if (request.signal.aborted) status = "stopped";
      if (failure && reply) status = "stopped";

      if (!reply.trim()) {
        send({ type: "error", code: failure ?? "provider" });
        if (open) controller.close();
        return;
      }

      const { data: messageId, error: saveError } = await client.rpc("learner_ai_complete_turn", {
        p_conversation_id: started.conversation_id,
        p_content: reply,
        p_status: status,
        p_model: usedModel,
        p_input_tokens: usage?.input,
        p_output_tokens: usage?.output,
        // Only the sources the reply actually cites are kept with the message.
        p_sources: citedSources(sources, reply).length ? citedSources(sources, reply) : undefined,
      });
      if (saveError || !messageId) {
        send({ type: "error", code: "unavailable" });
        if (open) controller.close();
        return;
      }

      // The reply is saved: release the learner's UI now. A new conversation's title follows as a late
      // event (bounded), because the light model's latency varies from about 1 s to over 20 s.
      send({ type: "done", messageId, status, fallback: usedModel !== attempts[0].model });
      if (started.created && !request.signal.aborted) {
        try {
          const title = (
            await generateGeminiText({
              model: geminiModel("light"),
              system:
                "Write a short title (2 to 6 words) for this tutoring conversation, in the same language as the learner's question. Keep product and technical names in English exactly as written (for example Odoo, CRM, Python). Reply with the title only: no quotes, no trailing punctuation, no Markdown.",
              turns: [{ role: "user", text: `Question: ${message.slice(0, 600)}\n\nAnswer start: ${reply.slice(0, 600)}` }],
              maxOutputTokens: 256,
              timeoutMs: TITLE_TIMEOUT_MS,
              signal: request.signal,
            })
          )
            .replace(/["*#`]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 80);
          if (title && !(await client.rpc("learner_ai_rename_conversation", { p_conversation_id: started.conversation_id, p_title: title })).error)
            send({ type: "title", title });
        } catch {
          // The truncated first question stays as the title.
        }
      }
      if (open) controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
