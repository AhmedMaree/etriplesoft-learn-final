import "server-only";

// Server-only Gemini adapter (REST, no SDK). The key never leaves the server and request/response
// bodies are never logged, because they contain learner questions and course material.
//
// Model roles (override with env vars; see .env.example):
// - chat:  gemini-3.8-flash      — default tutor replies; streamed with thinkingLevel "low" (measured
//                                  ~2 s versus ~60 s with the model's default thinking).
// - deep:  gemini-4-argon        — opt-in "Deep thinking" (thinkingLevel "high").
// - light: gemini-3.5-flash-lite — conversation titles, video transcription, and the last fallback.
// Replies fall back deep -> chat -> light when a model has no access or quota (free-tier quotas are per
// model and per day), keeping the requested thinking level.
// - embed: gemini-embedding-2    — 768-dimension embeddings for Course chat retrieval (multilingual:
//                                  English questions match Arabic video transcripts). Changing it requires
//                                  rebuilding the course index; chunks from another model are ignored.
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_PATTERN = /^[a-z0-9][a-z0-9.-]{1,63}$/;
const REQUEST_TIMEOUT_MS = 90_000;

export type GeminiModelRole = "chat" | "deep" | "light" | "embed";
export const EMBEDDING_DIMENSIONS = 768;
export type GeminiTurn = { role: "user" | "model"; text: string };
export type GeminiThinkingLevel = "low" | "medium" | "high";
export type GeminiErrorCode = "configuration" | "model" | "rate" | "blocked" | "unavailable";

export class GeminiError extends Error {
  constructor(readonly code: GeminiErrorCode) {
    super(`Gemini request failed: ${code}`);
    this.name = "GeminiError";
  }
}

const DEFAULT_MODELS: Record<GeminiModelRole, string> = {
  chat: "gemini-3.8-flash",
  deep: "gemini-4-argon",
  light: "gemini-3.5-flash-lite",
  embed: "gemini-embedding-2",
};
const MODEL_ENV: Record<GeminiModelRole, string> = {
  chat: "GEMINI_CHAT_MODEL",
  deep: "GEMINI_DEEP_MODEL",
  light: "GEMINI_LIGHT_MODEL",
  embed: "GEMINI_EMBEDDING_MODEL",
};

export function geminiModel(role: GeminiModelRole): string {
  const configured = process.env[MODEL_ENV[role]]?.trim();
  return configured && MODEL_PATTERN.test(configured) ? configured : DEFAULT_MODELS[role];
}

// Key pool: GEMINI_API_KEY, then GEMINI_API_KEY_2 … GEMINI_API_KEY_9, tried in order. A key that hits a
// limit rests for that model only (Gemini quotas are per Google project and per model): daily quotas until
// the daily reset, per-minute limits for a minute, rejected keys for an hour. Keys from the same Google
// project share one quota, so only keys from different projects add capacity.
const KEY_NAMES = ["GEMINI_API_KEY", ...Array.from({ length: 8 }, (_, i) => `GEMINI_API_KEY_${i + 2}`)];
const MINUTE_COOLDOWN_MS = 60_000;
const REJECTED_COOLDOWN_MS = 60 * 60_000;
const restingUntil = new Map<string, number>();

function apiKeys(): string[] {
  const keys = KEY_NAMES.map((name) => process.env[name]?.trim() ?? "").filter(Boolean);
  return [...new Set(keys)];
}

export function isGeminiConfigured(): boolean {
  return apiKeys().length > 0;
}

/** Gemini daily quotas reset at midnight Pacific time; 07:00 UTC is the earliest such moment. */
function nextDailyReset(now: number): number {
  const reset = new Date(now);
  reset.setUTCHours(7, 0, 0, 0);
  if (reset.getTime() <= now) reset.setUTCDate(reset.getUTCDate() + 1);
  return reset.getTime();
}

function rest(keyIndex: number, model: string, status: number, body: string) {
  const now = Date.now();
  const until = status === 429 ? (body.includes("PerDay") ? nextDailyReset(now) : now + MINUTE_COOLDOWN_MS) : now + REJECTED_COOLDOWN_MS;
  restingUntil.set(`${keyIndex}:${model}`, until);
}

/** Milliseconds until some key can call this model again (0 when one is available now). */
export function keyRestRemainingMs(role: GeminiModelRole): number {
  const model = geminiModel(role);
  const now = Date.now();
  const waits = apiKeys().map((_, index) => Math.max(0, (restingUntil.get(`${index}:${model}`) ?? 0) - now));
  return waits.length ? Math.min(...waits) : 0;
}

function availableKeys(model: string): { key: string; index: number }[] {
  const now = Date.now();
  return apiKeys()
    .map((key, index) => ({ key, index }))
    .filter(({ index }) => (restingUntil.get(`${index}:${model}`) ?? 0) <= now);
}

function errorForStatus(status: number): GeminiError {
  if (status === 429) return new GeminiError("rate");
  if (status === 404) return new GeminiError("model");
  if (status === 401 || status === 403) return new GeminiError("configuration");
  return new GeminiError("unavailable");
}

type RequestOptions = {
  model: string;
  system: string;
  turns: GeminiTurn[];
  maxOutputTokens: number;
  thinkingLevel?: GeminiThinkingLevel;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function requestBody({ system, turns, maxOutputTokens, thinkingLevel }: RequestOptions) {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    generationConfig: { maxOutputTokens, ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}) },
  });
}

// Transient provider failures (5xx, network) are retried once; nothing has streamed at this point.
const TRANSIENT_RETRY_DELAY_MS = 700;

async function request(url: string, model: string, body: string, signal: AbortSignal, callerSignal?: AbortSignal) {
  const keys = availableKeys(model);
  if (!apiKeys().length) throw new GeminiError("configuration");
  if (!keys.length) throw new GeminiError("rate");
  let lastStatus = 0;
  for (const { key, index } of keys) {
    for (let attempt = 0; ; attempt += 1) {
      let response: Response | null = null;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body,
          signal,
          cache: "no-store",
        });
      } catch (error) {
        if (callerSignal?.aborted) throw error;
        if (signal.aborted) throw new GeminiError("unavailable");
      }
      if (response?.ok) return response;
      const status = response?.status ?? 0;
      // Quota and key errors move on to the next key; only the error class is kept, never the body.
      // An invalid key is reported as 400 API_KEY_INVALID.
      const errorBody = response && [400, 401, 403, 429].includes(status) ? await response.text().catch(() => "") : "";
      if (status === 429 || status === 401 || status === 403 || errorBody.includes("API_KEY_INVALID")) {
        rest(index, model, status, errorBody);
        lastStatus = status === 400 ? 403 : status;
        break;
      }
      if (!errorBody) await response?.body?.cancel();
      const transient = !response || status >= 500;
      if (!transient || attempt >= 1) throw response ? errorForStatus(status) : new GeminiError("unavailable");
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
      if (signal.aborted) throw callerSignal?.aborted ? signal.reason : new GeminiError("unavailable");
    }
  }
  throw errorForStatus(lastStatus || 429);
}

function deadline(timeoutMs: number, callerSignal?: AbortSignal) {
  const signals = [AbortSignal.timeout(timeoutMs)];
  if (callerSignal) signals.push(callerSignal);
  return AbortSignal.any(signals);
}

async function post(options: RequestOptions, method: "generateContent" | "streamGenerateContent") {
  const query = method === "streamGenerateContent" ? "?alt=sse" : "";
  const url = `${API_BASE}${encodeURIComponent(options.model)}:${method}${query}`;
  return request(url, options.model, requestBody(options), deadline(options.timeoutMs ?? REQUEST_TIMEOUT_MS, options.signal), options.signal);
}

export type GeminiChunk = {
  text: string;
  finishReason: string | null;
  usage: { input: number; output: number } | null;
};

type RawResponse = {
  candidates?: { content?: { parts?: { text?: unknown; thought?: unknown }[] }; finishReason?: unknown }[];
  promptFeedback?: { blockReason?: unknown };
  usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown; thoughtsTokenCount?: unknown };
};

const BLOCKED_FINISH = new Set(["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION"]);

function readChunk(raw: RawResponse): GeminiChunk {
  if (raw.promptFeedback?.blockReason) throw new GeminiError("blocked");
  const candidate = raw.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");
  const finishReason = typeof candidate?.finishReason === "string" ? candidate.finishReason : null;
  if (finishReason && BLOCKED_FINISH.has(finishReason) && !text) throw new GeminiError("blocked");
  const usage = raw.usageMetadata;
  const count = (value: unknown) => (typeof value === "number" ? value : 0);
  return {
    text,
    finishReason,
    usage:
      usage && typeof usage.promptTokenCount === "number"
        ? {
            input: usage.promptTokenCount,
            // Thinking is billed at the output rate, so the recorded output covers reply and thinking tokens.
            output: count(usage.candidatesTokenCount) + count(usage.thoughtsTokenCount),
          }
        : null,
  };
}

/** Streams reply text. Throws GeminiError before the first chunk for request-level failures. */
export async function* streamGemini(options: RequestOptions): AsyncGenerator<GeminiChunk> {
  const response = await post(options, "streamGenerateContent");
  if (!response.body) throw new GeminiError("unavailable");
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let boundary: number;
      while ((boundary = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let parsed: RawResponse;
        try {
          parsed = JSON.parse(payload) as RawResponse;
        } catch {
          continue;
        }
        yield readChunk(parsed);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** One short, non-streaming completion (used with the light model). */
export async function generateGeminiText(options: RequestOptions): Promise<string> {
  const response = await post(options, "generateContent");
  return readChunk((await response.json()) as RawResponse).text.trim();
}

const EMBED_BATCH = 100;

/** Embeds texts for retrieval ("document" for course chunks, "query" for learner questions). */
export async function embedTexts(texts: string[], task: "document" | "query", signal?: AbortSignal): Promise<number[][]> {
  const model = geminiModel("embed");
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBED_BATCH) {
    const batch = texts.slice(start, start + EMBED_BATCH);
    const body = JSON.stringify({
      requests: batch.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        taskType: task === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
        outputDimensionality: EMBEDDING_DIMENSIONS,
      })),
    });
    const response = await request(`${API_BASE}${encodeURIComponent(model)}:batchEmbedContents`, model, body, deadline(REQUEST_TIMEOUT_MS, signal), signal);
    const parsed = (await response.json()) as { embeddings?: { values?: unknown }[] };
    const values = (parsed.embeddings ?? []).map((item) => item.values);
    if (values.length !== batch.length || values.some((v) => !Array.isArray(v) || v.length !== EMBEDDING_DIMENSIONS || !v.every((n) => typeof n === "number" && Number.isFinite(n))))
      throw new GeminiError("unavailable");
    vectors.push(...(values as number[][]));
  }
  return vectors;
}
