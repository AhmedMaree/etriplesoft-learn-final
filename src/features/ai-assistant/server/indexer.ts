import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { GeminiError, embedTexts, geminiModel, keyRestRemainingMs } from "./gemini";
import { chunkHeader, chunkText } from "./rag";

type Client = SupabaseClient<Database>;

export type IndexResult = { sources: number; embeddedSources: number; embeddedChunks: number; totalChunks: number; complete: boolean };

// Free-tier embedding quotas are small per minute; a large course (hours of transcripts) needs several
// minutes. Per-minute limits are waited out within this budget; anything left is picked up by the next
// rebuild because finished sources are saved and skipped.
const TIME_BUDGET_MS = 270_000;

// Small groups keep each request under a per-minute token allowance, so even a long transcript progresses.
const EMBED_GROUP = 10;

async function embedWithinBudget(chunks: string[], deadline: number): Promise<number[][] | null> {
  const vectors: number[][] = [];
  while (vectors.length < chunks.length) {
    try {
      vectors.push(...(await embedTexts(chunks.slice(vectors.length, vectors.length + EMBED_GROUP), "document")));
    } catch (error) {
      if (!(error instanceof GeminiError) || error.code !== "rate") throw error;
      const wait = Math.max(keyRestRemainingMs("embed"), 5_000);
      if (Date.now() + wait > deadline) return null;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
  return vectors;
}

/**
 * Builds or refreshes the Course chat index of one course. Runs with the caller's client: every RPC
 * re-checks the current admin role, accepts chunks only for sources that are currently published, and the
 * finish step drops chunks of removed or changed sources and writes an audit row. Unchanged sources
 * (same content hash and embedding model) are skipped, so a rebuild after small edits is cheap.
 */
export async function indexCourse(client: Client, courseId: string, options: { force?: boolean } = {}): Promise<IndexResult> {
  const model = geminiModel("embed");
  const { data: sources, error } = await client.rpc("admin_ai_index_sources", { p_course_id: courseId, p_model: model });
  if (error) throw new Error(error.code === "42501" ? "forbidden" : "sources");
  const courseTitle =
    sources.find((s) => s.source_type === "course" && s.source_locale === "en")?.label ??
    sources.find((s) => s.source_type === "course")?.label ??
    "Course";

  const pending = sources
    .filter((source) => options.force || !source.indexed)
    .map((source) => {
      const header = chunkHeader({
        courseTitle,
        sourceType: source.source_type,
        modulePosition: source.module_position,
        lessonPosition: source.lesson_position,
        label: source.label,
      });
      return { source, chunks: chunkText(source.content).map((text) => `${header}\n${text}`) };
    })
    .filter((item) => item.chunks.length > 0);

  let embeddedChunks = 0;
  let embeddedSources = 0;
  let complete = true;
  const deadline = Date.now() + TIME_BUDGET_MS;
  for (const { source, chunks } of pending) {
    const vectors = await embedWithinBudget(chunks, deadline);
    if (!vectors) {
      complete = false;
      break;
    }
    const { error: saveError } = await client.rpc("admin_ai_replace_source_chunks", {
      p_course_id: courseId,
      p_source_key: source.source_key,
      p_source_hash: source.source_hash,
      p_model: model,
      p_chunks: chunks.map((content, index) => ({ content, embedding: vectors[index] })),
    });
    // P0002: the source changed while indexing; the finish step drops its old chunks and a rerun picks it up.
    if (saveError && saveError.code !== "P0002") throw new Error("save");
    if (!saveError) {
      embeddedChunks += chunks.length;
      embeddedSources += 1;
    }
  }

  const { data: totalChunks, error: finishError } = await client.rpc("admin_ai_finish_course_index", { p_course_id: courseId, p_model: model });
  if (finishError) throw new Error("finish");
  return { sources: sources.length, embeddedSources, embeddedChunks, totalChunks: totalChunks ?? 0, complete };
}
