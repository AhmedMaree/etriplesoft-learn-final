import { getTranslations } from "next-intl/server";
import { Terminal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminAccess } from "@/lib/supabase/auth";
import { AdminAiIndexTable, type AdminIndexRow } from "@/features/ai-assistant/components/admin-ai-index";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";

export const metadata = { robots: { index: false, follow: false } };
// Rebuilding embeds every changed source of a course; allow long-running server actions.
export const maxDuration = 300;

export default async function AiIndexAdministration() {
  if ((await getAdminAccess()).status !== "admin") return null;
  const t = await getTranslations("aiIndex");
  const admin = await getTranslations("admin");
  const { data, error } = await (await createClient()).rpc("admin_ai_index_overview");
  const rows: AdminIndexRow[] = (data ?? []).map((row) => ({
    courseId: row.course_id,
    slug: row.slug,
    title: row.title,
    videos: row.videos,
    transcribedVideos: row.transcribed_videos,
    chunkCount: row.chunk_count,
    sourceCount: row.source_count,
    embeddingModel: row.embedding_model,
    indexedAt: row.indexed_at,
  }));
  return (
    <>
      <AdminPageHeader eyebrow={admin("nav.groups.content")} title={t("title")} description={t("description")} />
      <section className="panel admin-card" aria-labelledby="admin-ai-courses">
        <div className="admin-card-head">
          <h2 id="admin-ai-courses">{t("coursesTitle")}</h2>
          {!error && <span className="admin-count" dir="ltr">{rows.length}</span>}
        </div>
        {error ? <p className="admin-status error" role="alert">{t("errors.failed")}</p> : <AdminAiIndexTable rows={rows} />}
      </section>
      <aside className="admin-note">
        <Terminal size={18} aria-hidden="true" />
        <p>{t("transcribeHint")}</p>
      </aside>
    </>
  );
}
