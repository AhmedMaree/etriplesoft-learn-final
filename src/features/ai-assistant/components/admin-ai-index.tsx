"use client";
import { useActionState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import type { AdminActionState } from "@/features/admin/action-state";
import { rebuildCourseIndexAction } from "../server/index-actions";

export type AdminIndexRow = {
  courseId: string;
  slug: string;
  title: string;
  videos: number;
  transcribedVideos: number;
  chunkCount: number;
  sourceCount: number | null;
  embeddingModel: string | null;
  indexedAt: string | null;
};

function RebuildButton({ courseId, label }: { courseId: string; label: string }) {
  const t = useTranslations("aiIndex");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(rebuildCourseIndexAction, {});
  return (
    <form action={action} className="admin-inline-form">
      <input type="hidden" name="course_id" value={courseId} />
      <button className="btn outline admin-btn-sm" type="submit" disabled={pending} aria-label={`${t("rebuild")}: ${label}`}>
        {pending ? t("rebuilding") : t("rebuild")}
      </button>
      {state.error && <p className="admin-status error" role="alert">{t(`errors.${state.error}`)}</p>}
      {state.success && <p className="admin-status success" role="status">{t("success")}</p>}
    </form>
  );
}

export function AdminAiIndexTable({ rows }: { rows: AdminIndexRow[] }) {
  const t = useTranslations("aiIndex");
  const format = useFormatter();
  if (!rows.length) return <p className="admin-empty">{t("empty")}</p>;
  return (
    <div className="admin-table-wrap" tabIndex={0} role="region" aria-label={t("title")}>
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">{t("course")}</th>
            <th scope="col">{t("transcripts")}</th>
            <th scope="col">{t("chunks")}</th>
            <th scope="col">{t("indexedAt")}</th>
            <th scope="col">
              <span className="admin-visually-hidden">{t("rebuild")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.courseId}>
              <td>
                <strong dir="auto">{row.title}</strong>
                <span className="admin-ltr" dir="ltr">{row.slug}</span>
              </td>
              <td>
                <span className="admin-meter-label">{t("transcriptCount", { done: row.transcribedVideos, total: row.videos })}</span>
                <span className="admin-meter" aria-hidden="true">
                  <span
                    className={row.videos > 0 && row.transcribedVideos >= row.videos ? "done" : ""}
                    style={{ inlineSize: `${row.videos ? Math.min(100, Math.round((row.transcribedVideos / row.videos) * 100)) : 0}%` }}
                  />
                </span>
              </td>
              <td>
                {row.indexedAt ? (
                  <>
                    <span className="admin-badge active">{t("indexed")}</span>
                    <span className="admin-sub">{t("chunkCount", { chunks: row.chunkCount, sources: row.sourceCount ?? 0 })}</span>
                  </>
                ) : (
                  <span className="admin-badge warn">{t("notIndexed")}</span>
                )}
              </td>
              <td>{row.indexedAt ? format.dateTime(new Date(row.indexedAt), { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
              <td>
                <RebuildButton courseId={row.courseId} label={row.title} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
