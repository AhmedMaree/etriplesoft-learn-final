"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { lessonHref } from "@/features/courses/components/course-links";
import type { Database } from "@/types/database";

type Lesson =
  Database["public"]["Functions"]["mux_list_manageable_lessons"]["Returns"][number];
type Video =
  Database["public"]["Functions"]["mux_get_video_management"]["Returns"][number];

function CaptionControls({ video }: { video: Video }) {
  const t = useTranslations("videoManagement");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [locales, setLocales] = useState(video.required_caption_locales);
  async function update(body: object) {
    setBusy(true);
    setMessage("");
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
      setMessage(t("captionsSaved"));
    } catch {
      setMessage(t("captionsError"));
    } finally {
      setBusy(false);
    }
  }
  const captions = Array.isArray(video.captions) ? video.captions : [];
  return (
    <div>
      <fieldset disabled={busy}>
        <legend>{t("requiredCaptions")}</legend>
        {(["en", "ar"] as const).map((locale) => (
          <label key={locale}>
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
            {t(locale === "en" ? "english" : "arabic")}
          </label>
        ))}
      </fieldset>
      <button
        className="btn outline"
        type="button"
        disabled={busy}
        onClick={() => void update({ requiredLocales: locales })}
      >
        {t("saveCaptions")}
      </button>
      {captions.map((caption) => {
        if (
          !caption ||
          typeof caption !== "object" ||
          Array.isArray(caption) ||
          typeof caption.locale !== "string" ||
          typeof caption.trackId !== "string"
        )
          return null;
        const { locale, trackId } = caption;
        return (
          <button
            key={trackId}
            type="button"
            className="btn outline"
            disabled={busy || caption.reviewStatus === "reviewed"}
            onClick={() => void update({ locale, trackId })}
          >
            {caption.reviewStatus === "reviewed"
              ? t("captionReviewed", { locale })
              : t("reviewCaption", { locale })}
          </button>
        );
      })}
      <p>{t("captionHint")}</p>
      <p role="status">{message}</p>
    </div>
  );
}

export function VideoManagement({ lessons }: { lessons: Lesson[] }) {
  const t = useTranslations("videoManagement");
  const [lessonId, setLessonId] = useState(lessons[0]?.lesson_id ?? "");
  const [videos, setVideos] = useState<Video[]>([]);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("");
  const uploader = useRef<UpChunk | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const selected = lessons.find((lesson) => lesson.lesson_id === lessonId);

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
        if (active) setVideos(data.videos);
      } catch {
        if (active) setMessage(t("statusError"));
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
    const file = data.get("video");
    if (
      !(file instanceof File) ||
      !file.size ||
      !file.type.startsWith("video/")
    ) {
      setMessage(t("invalidFile"));
      return;
    }
    setBusy(true);
    setPercent(0);
    setMessage(t("uploading"));
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
        file,
        chunkSize: 5120,
        attempts: 5,
      });
      uploader.current = task;
      task.on("progress", (event) => setPercent(Math.round(event.detail)));
      task.on("error", () => {
        setBusy(false);
        setMessage(t("uploadError"));
      });
      task.on("success", () => {
        setBusy(false);
        setPercent(100);
        setMessage(t("processing"));
        form.current?.reset();
      });
    } catch {
      setBusy(false);
      setMessage(t("uploadError"));
    }
  }

  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("description")}</p>
      {!lessons.length ? (
        <p role="status">{t("empty")}</p>
      ) : (
        <>
          <form
            ref={form}
            className="panel video-upload-form"
            onSubmit={upload}
          >
            <label htmlFor="video-lesson">{t("lesson")}</label>
            <select
              id="video-lesson"
              value={lessonId}
              disabled={busy}
              onChange={(event) => {
                setLessonId(event.target.value);
                setVideos([]);
                setMessage("");
              }}
            >
              {lessons.map((lesson) => (
                <option key={lesson.lesson_id} value={lesson.lesson_id}>
                  {lesson.course_title} — {lesson.lesson_title}
                </option>
              ))}
            </select>
            <label htmlFor="video-file">{t("file")}</label>
            <input
              id="video-file"
              name="video"
              type="file"
              accept="video/*"
              required
              disabled={busy}
            />
            <button type="submit" className="btn" disabled={busy}>
              {busy ? t("uploading") : t("upload")}
            </button>
            {busy && (
              <progress
                aria-label={t("uploadProgress")}
                value={percent}
                max={100}
              />
            )}
            <p role="status">{message}</p>
          </form>
          {selected && (
            <Link
              className="text-link"
              href={lessonHref(selected.course_slug, lessonId)}
            >
              {t("viewLesson")}
            </Link>
          )}
          <section className="panel video-upload-form">
            <h2>{t("videos")}</h2>
            {!videos.length && <p>{t("noVideo")}</p>}
            {videos.map((video) => (
              <div key={video.video_id} className="video-status-row">
                <strong>{t(`statuses.${video.status}`)}</strong>
                {video.duration_seconds && (
                  <span>
                    {t("duration", { seconds: video.duration_seconds })}
                  </span>
                )}
                {video.mux_asset_id && (
                  <small dir="ltr">{video.mux_asset_id}</small>
                )}
                <p>
                  {t("captionRequirements", {
                    locales:
                      video.required_caption_locales.join(", ") || t("none"),
                  })}
                </p>
                {video.status === "ready" && <CaptionControls video={video} />}
              </div>
            ))}
          </section>
        </>
      )}
    </>
  );
}
