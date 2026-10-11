import pathData from "../content/learning-paths.json";
import { roleSlugs, type RoleSlug } from "../model/course";
import type { MarketingMessages } from "./messages";

export type LearningPathRecord = { role: RoleSlug; stages: string[] };

function isPathRecord(value: unknown): value is LearningPathRecord {
  if (typeof value !== "object" || value === null) return false;
  const { role, stages } = value as Record<string, unknown>;
  return (
    typeof role === "string" &&
    roleSlugs.some((slug) => slug === role) &&
    Array.isArray(stages) &&
    stages.every((stage) => typeof stage === "string")
  );
}

const rawPaths: readonly unknown[] = pathData;

export const learningPaths: LearningPathRecord[] = rawPaths.map((raw) => {
  if (!isPathRecord(raw)) throw new Error("Invalid learning path record");
  return { role: raw.role, stages: raw.stages };
});

/** Localized presentation copy (level, duration, audience tags) for a role's path. */
export function getPathCopy(m: MarketingMessages, role: RoleSlug) {
  const meta = m.home.pathMeta[role];
  const levelKey = meta.level;
  const levelLabel = levelKey in m.levels ? m.levels[levelKey as keyof MarketingMessages["levels"]] : levelKey;
  return {
    title: m.roles[role],
    description: meta.description,
    levelKey,
    levelLabel,
    duration: meta.duration,
    tags: meta.tags,
  };
}
