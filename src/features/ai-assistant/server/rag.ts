import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ChatSource } from "../types";
import { embedTexts, geminiModel } from "./gemini";

type Client = SupabaseClient<Database>;

// Retrieval for Course chat. Measured with gemini-embedding-2 (768 d): a relevant cross-language match
// scored ~0.82, a related-but-different Odoo text ~0.60 and an unrelated text ~0.47.
const SEARCH_LIMIT = 8;
const MIN_SIMILARITY = 0.5;
// Excerpts far below the best match add noise (short module titles score ~0.5 against most questions).
const RELATIVE_CUTOFF = 0.12;
const CHUNK_CHARS = 1200;
const CHUNK_OVERLAP = 150;

export type RetrievedExcerpt = {
  n: number;
  lessonId: string | null;
  sourceType: string;
  label: string;
  content: string;
  similarity: number;
};

function splitLong(unit: string, limit: number): string[] {
  if (unit.length <= limit) return [unit];
  // Sentences first (Latin and Arabic punctuation), then words for unpunctuated transcripts.
  const sentences = unit.split(/(?<=[.!?؟。])\s+/);
  const parts: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= limit) parts.push(sentence);
    else {
      let current = "";
      for (const word of sentence.split(/\s+/)) {
        if (current && current.length + word.length + 1 > limit) {
          parts.push(current);
          current = word;
        } else current = current ? `${current} ${word}` : word;
      }
      if (current) parts.push(current);
    }
  }
  return parts;
}

function overlapTail(text: string): string {
  if (text.length <= CHUNK_OVERLAP) return text;
  const tail = text.slice(-CHUNK_OVERLAP);
  const space = tail.indexOf(" ");
  return space >= 0 ? tail.slice(space + 1) : tail;
}

/** Splits source text into ~1,200-character chunks with a short overlap, keeping paragraphs together. */
export function chunkText(text: string): string[] {
  const units = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitLong(paragraph, CHUNK_CHARS - CHUNK_OVERLAP));
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > CHUNK_CHARS) {
      chunks.push(current);
      current = `${overlapTail(current)} ${unit}`;
    } else current = current ? `${current}\n\n${unit}` : unit;
  }
  if (current) chunks.push(current);
  return chunks;
}

const TYPE_LABEL: Record<string, string> = {
  course: "course overview",
  module: "module",
  lesson: "lesson",
  resource: "lesson resource",
  transcript: "video transcript",
  document: "lesson document",
};

/** A context line prepended to each chunk; it improves retrieval and tells the model where text came from. */
export function chunkHeader(source: {
  courseTitle: string;
  sourceType: string;
  modulePosition: number | null;
  lessonPosition: number | null;
  label: string;
}): string {
  const where = [
    source.courseTitle,
    source.modulePosition ? `Module ${source.modulePosition}` : "",
    source.lessonPosition && source.modulePosition ? `Lesson ${source.modulePosition}.${source.lessonPosition}: ${source.label}` : source.sourceType === "module" ? source.label : "",
  ].filter(Boolean);
  return `[${where.join(" › ")} — ${TYPE_LABEL[source.sourceType] ?? source.sourceType}]`;
}

/**
 * Finds the course excerpts most relevant to the question. The database re-checks enrollment, returns only
 * chunks whose source is still published and unchanged, and filters by the current embedding model.
 */
export async function retrieveCourseExcerpts(
  client: Client,
  courseId: string,
  query: string,
  signal?: AbortSignal,
): Promise<RetrievedExcerpt[]> {
  const [vector] = await embedTexts([query.slice(0, 6000)], "query", signal);
  const { data, error } = await client.rpc("learner_ai_search_course", {
    p_course_id: courseId,
    p_model: geminiModel("embed"),
    p_embedding: `[${vector.join(",")}]`,
    p_limit: SEARCH_LIMIT,
  });
  if (error) throw new Error(error.code === "42501" ? "access" : "search");
  const best = data?.[0]?.similarity ?? 0;
  return (data ?? [])
    .filter((row) => row.similarity >= Math.max(MIN_SIMILARITY, best - RELATIVE_CUTOFF))
    .map((row, index) => ({
      n: index + 1,
      lessonId: row.lesson_id,
      sourceType: row.source_type,
      label: row.label,
      content: row.content,
      similarity: row.similarity,
    }));
}

/** The [n] markers a reply actually uses. */
export function citedNumbers(reply: string): Set<number> {
  return new Set([...reply.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])));
}

/** Keeps only the citation chips whose excerpts the reply cites. */
export function citedSources(sources: ChatSource[], reply: string): ChatSource[] {
  const cited = citedNumbers(reply);
  return sources
    .map((source) => ({ ...source, refs: source.refs.filter((n) => cited.has(n)) }))
    .filter((source) => source.refs.length > 0);
}

/** Groups excerpt numbers by lesson for the citation chips (one chip per lesson or course-level source). */
export function excerptSources(
  excerpts: RetrievedExcerpt[],
  courseSlug: string,
  lessonTitles: Map<string, string>,
): ChatSource[] {
  const grouped = new Map<string, ChatSource>();
  for (const excerpt of excerpts) {
    const key = excerpt.lessonId ?? `${excerpt.sourceType}:${excerpt.label}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.refs.push(excerpt.n);
      if (excerpt.sourceType === "transcript") existing.video = true;
      if (excerpt.sourceType === "document") existing.document = true;
      continue;
    }
    grouped.set(key, {
      refs: [excerpt.n],
      lessonId: excerpt.lessonId,
      courseSlug,
      label: ((excerpt.lessonId && lessonTitles.get(excerpt.lessonId)) || excerpt.label).slice(0, 160),
      video: excerpt.sourceType === "transcript",
      document: excerpt.sourceType === "document",
    });
  }
  return [...grouped.values()].slice(0, 12);
}
