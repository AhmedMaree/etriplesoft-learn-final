"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { useTranslations } from "next-intl";
import { CircleCheck, ExternalLink, FileVideo, RefreshCw, UploadCloud } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { lessonHref } from "@/features/courses/components/course-links";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import type { Database } from "@/types/database";

type Lesson =
  Database["public"]["Functions"]["mux_list_manageable_lessons"]["Returns"][number];
type Video =
  Database["public"]["Functions"]["mux_get_video_management"]["Returns"][number];

const READY = new Set(["ready"]);
const FAILED = new Set(["errored", "cancelled", "timed_out", "upload_failed"]);

function statusTone(status: string) {
  return READY.has(status) ? "active" : FAILED.has(status) ? "failed" : "warn";
}

// 2447 -> "40:47", 3725 -> "1:02:05"; Western digits in both locales.
function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function formatSize(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function CaptionControls({ video }: { video: Video }) {
  const t = useTranslations("videoManagement");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [locales, setLocales] = useState(video.required_caption_locales);
  async function update(body: object) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/mux/videos/${video.video_id}/captions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) throw new Error("caption");
      setMessage({ tone: "success", text: t("captionsSaved") });
    } catch {
      setMessage({ tone: "error", text: t("captionsError") });
    } finally {
      setBusy(false);
    }
  }
  const captions = (Array.isArray(video.captions) ? video.captions : []).flatMap((caption) =>
    caption &&
    typeof caption === "object" &&
    !Array.isArray(caption) &&
    typeof caption.locale === "string" &&
    typeof caption.trackId === "string"
      ? [{ locale: caption.locale, trackId: caption.trackId, reviewed: caption.reviewStatus === "reviewed" }]
      : [],
  );
  return (
    <div className="video-captions">
      <fieldset disabled={busy} className="video-caption-langs">
        <legend>{t("requiredCaptions")}</legend>
        {(["en", "ar"] as const).map((locale) => (
          <label key={locale} className="video-chip-check">
            <input
              type="checkbox"
              checked={locales.includes(locale)}
              onChange={(event) =>
                setLocales(
                  event.target.checked
                    ? [...locales, locale]
                    : locales.filter((item) => item !== locale),
                )
              }
            />
            <span>{t(locale === "en" ? "english" : "arabic")}</span>
          </label>
        ))}
        <button
          className="btn outline admin-btn-sm"
          type="button"
          disabled={busy}
          onClick={() => void update({ requiredLocales: locales })}
        >
          {t("saveCaptions")}
        </button>
      </fieldset>

      <div className="video-tracks">
        <p className="video-label">{t("tracks")}</p>
        {captions.length === 0 ? (
          <p className="admin-sub">{t("noTracks")}</p>
        ) : (
          <ul>
            {captions.map(({ locale, trackId, reviewed }) => (
              <li key={trackId}>
                <span className="admin-locale-chip published">{locale.toUpperCase()}</span>
                {reviewed ? (
                  <span className="admin-badge active">{t("captionReviewed", { locale })}</span>
                ) : (
                  <button
                    type="button"
                    className="btn outline admin-btn-sm"
                    disabled={busy}
                    onClick={() => void update({ locale, trackId })}
                  >
                    {t("reviewCaption", { locale })}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="admin-hint video-caption-hint">{t("captionHint")}</p>
      <p className={`admin-status ${message?.tone ?? ""}`} role="status">{message?.text ?? ""}</p>
    </div>
  );
}

export function VideoManagement({
  lessons,
  initialLessonId,
  eyebrow,
}: {
  lessons: Lesson[];
  initialLessonId?: string;
  eyebrow?: string;
}) {
  const t = useTranslations("videoManagement");
  const [lessonId, setLessonId] = useState(
    lessons.some((lesson) => lesson.lesson_id === initialLessonId)
      ? (initialLessonId as string)
      : (lessons[0]?.lesson_id ?? ""),
  );
  const [videos, setVideos] = useState<Video[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | ""; text: string } | null>(null);
  const uploader = useRef<UpChunk | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const selected = lessons.find((lesson) => lesson.lesson_id === lessonId);

  // Lessons arrive flat; group them by course for the picker.
  const courses = lessons.reduce<{ title: string; lessons: Lesson[] }[]>((groups, lesson) => {
    const group = groups.find((item) => item.title === lesson.course_title);
    if (group) group.lessons.push(lesson);
    else groups.push({ title: lesson.course_title, lessons: [lesson] });
    return groups;
  }, []);

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/mux/lessons/${lessonId}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("status");
        const data: { videos: Video[] } = await response.json();
        if (active) {
          setVideos(data.videos);
          setLoaded(true);
        }
      } catch {
        if (active) setMessage({ tone: "error", text: t("statusError") });
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [lessonId, t]);

  useEffect(
    () => () => {
      uploader.current?.abort();
    },
    [],
  );

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const chosen = data.get("video");
    if (
      !(chosen instanceof File) ||
      !chosen.size ||
      !chosen.type.startsWith("video/")
    ) {
      setMessage({ tone: "error", text: t("invalidFile") });
      return;
    }
    setBusy(true);
    setPercent(0);
    setMessage({ tone: "", text: t("uploading") });
    try {
      const response = await fetch("/api/mux/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!response.ok) throw new Error("upload");
      const result: { uploadUrl: string } = await response.json();
      const task = createUpload({
        endpoint: result.uploadUrl,
        file: chosen,
        chunkSize: 5120,
        attempts: 5,
      });
      uploader.current = task;
      task.on("progress", (event) => setPercent(Math.round(event.detail)));
      task.on("error", () => {
        setBusy(false);
        setMessage({ tone: "error", text: t("uploadError") });
      });
      task.on("success", () => {
        setBusy(false);
        setPercent(100);
        setMessage({ tone: "success", text: t("processing") });
        setFile(null);
        form.current?.reset();
      });
    } catch {
      setBusy(false);
      setMessage({ tone: "error", text: t("uploadError") });
    }
  }

  return (
    <div className="admin-scope video-admin">
      <AdminPageHeader
        eyebrow={eyebrow}
        title={t("title")}
        description={t("description")}
        actions={
          selected && (
            <Link className="btn outline" href={lessonHref(selected.course_slug, lessonId)}>
              <ExternalLink size={16} aria-hidden="true" />
              {t("viewLesson")}
            </Link>
          )
        }
      />
      {!lessons.length ? (
        <p className="admin-empty" role="status">{t("empty")}</p>
      ) : (
        <div className="video-layout">
          <form ref={form} className="panel admin-card video-upload" onSubmit={upload} aria-labelledby="video-upload-title">
            <h2 id="video-upload-title">{t("uploadTitle")}</h2>
            <label className="admin-field" htmlFor="video-lesson">
              <span>{t("lesson")}</span>
              <select
                id="video-lesson"
                value={lessonId}
                disabled={busy}
                onChange={(event) => {
                  setLessonId(event.target.value);
                  setVideos([]);
                  setLoaded(false);
                  setMessage(null);
                }}
              >
                {courses.map((course) => (
                  <optgroup key={course.title} label={course.title}>
                    {course.lessons.map((lesson) => (
                      <option key={lesson.lesson_id} value={lesson.lesson_id}>
                        {lesson.lesson_title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <small className="admin-field-hint">{t("lessonCount", { lessons: lessons.length, courses: courses.length })}</small>
            </label>

            <div className="admin-field">
              <span id="video-file-label">{t("file")}</span>
              <div className={`video-drop ${file ? "has-file" : ""} ${busy ? "is-busy" : ""}`}>
                <input
                  id="video-file"
                  name="video"
                  type="file"
                  accept="video/*"
                  required
                  disabled={busy}
                  aria-labelledby="video-file-label"
                  aria-describedby="video-file-hint"
                  onChange={(event) => {
                    setFile(event.target.files?.[0] ?? null);
                    setMessage(null);
                  }}
                />
                {file ? (
                  <>
                    <FileVideo size={28} aria-hidden="true" />
                    <strong dir="auto">{file.name}</strong>
                    <span className="admin-sub" dir="ltr">{formatSize(file.size)}</span>
                    <span className="video-drop-action">{t("changeFile")}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={30} aria-hidden="true" />
                    <strong>{t("dropTitle")}</strong>
                    <span className="video-drop-action">{t("browse")}</span>
                  </>
                )}
              </div>
              <small id="video-file-hint" className="admin-field-hint">{t("dropHint")}</small>
            </div>

            {busy && (
              <div className="video-progress">
                <div className="video-progress-head">
                  <span>{t("uploading")}</span>
                  <span dir="ltr">{percent}%</span>
                </div>
                <div className="video-progress-track" role="progressbar" aria-label={t("uploadProgress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <span style={{ inlineSize: `${percent}%` }} />
                </div>
              </div>
            )}

            <div className="admin-form-actions">
              <button type="submit" className="btn" disabled={busy}>
                <UploadCloud size={18} aria-hidden="true" />
                {busy ? t("uploading") : t("upload")}
              </button>
            </div>
            <p className={`admin-status ${message?.tone ?? ""}`} role="status">{message?.text ?? ""}</p>
          </form>

          <section className="panel admin-card video-status" aria-labelledby="video-status-title">
            <div className="admin-card-head">
              <h2 id="video-status-title">{t("videos")}</h2>
              <span className="video-live">
                <RefreshCw size={14} aria-hidden="true" />
                {t("autoRefresh")}
              </span>
            </div>
            {selected && (
              <p className="video-selected">
                <span className="admin-sub-inline" dir="auto">{selected.course_title}</span>
                <strong dir="auto">{selected.lesson_title}</strong>
              </p>
            )}
            {!loaded ? (
              <p className="admin-empty">{t("loading")}</p>
            ) : !videos.length ? (
              <p className="admin-empty">{t("noVideo")}</p>
            ) : (
              <ul className="video-list">
                {videos.map((video) => (
                  <li key={video.video_id} className="video-item">
                    <div className="video-item-head">
                      <span className={`admin-badge ${statusTone(video.status)}`}>
                        {t.has(`statuses.${video.status}`) ? t(`statuses.${video.status}`) : video.status}
                      </span>
                      {video.duration_seconds ? (
                        <span className="video-duration" dir="ltr">{formatDuration(video.duration_seconds)}</span>
                      ) : null}
                    </div>
                    <dl className="video-facts">
                      {video.mux_asset_id && (
                        <div>
                          <dt>{t("assetId")}</dt>
                          <dd><code className="admin-code" dir="ltr">{video.mux_asset_id}</code></dd>
                        </div>
                      )}
                      {video.status !== "ready" && (
                      <div>
                        <dt>{t("requiredCaptions")}</dt>
                        <dd>
                          {video.required_caption_locales.length ? (
                            <span className="admin-locale-chips">
                              {video.required_caption_locales.map((locale) => (
                                <span key={locale} className="admin-locale-chip published">{locale.toUpperCase()}</span>
                              ))}
                            </span>
                          ) : (
                            t("none")
                          )}
                        </dd>
                      </div>
                      )}
                    </dl>
                    {video.status === "ready" ? (
                      <CaptionControls video={video} />
                    ) : FAILED.has(video.status) ? (
                      <p className="admin-status error">{t("failedHint")}</p>
                    ) : (
                      <p className="admin-sub">{t("processingHint")}</p>
                    )}
                    {video.status === "ready" && (
                      <p className="video-ready">
                        <CircleCheck size={16} aria-hidden="true" />
                        {t("readyHint")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
