"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { ArrowRight, Hourglass, Lock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";

type Playback = { playbackId: string; tokens: { playback: string; thumbnail: string; storyboard: string } };
type State = { kind: "loading" } | { kind: "ready"; playback: Playback } | { kind: "unavailable" | "error" };

type Props = {
  lessonId: string;
  locale: Locale;
  title: string;
  next: { href: string; title: string } | null;
};

async function requestPlayback(lessonId: string, locale: Locale): Promise<State> {
  try {
    const response = await fetch("/api/mux/playback-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId, locale }),
      cache: "no-store",
    });
    // 403 covers both "not entitled" and "video still processing"; the page already checked entitlement.
    if (response.status === 403) return { kind: "unavailable" };
    if (!response.ok) return { kind: "error" };
    const data = await response.json();
    return {
      kind: "ready",
      playback: {
        playbackId: data.playbackId,
        tokens: { playback: data.token, thumbnail: data.thumbnailToken, storyboard: data.storyboardToken },
      },
    };
  } catch {
    return { kind: "error" };
  }
}

/** Requests a short-lived signed playback token from the server, then plays the lesson with Mux Player. */
export function LessonPlayer({ lessonId, locale, title, next }: Props) {
  const t = useTranslations("courses");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [ended, setEnded] = useState(false);
  const retried = useRef(false);

  // The parent keys this component by lesson, so state starts fresh for every lesson.
  useEffect(() => {
    let active = true;
    void requestPlayback(lessonId, locale).then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, [lessonId, locale]);

  const load = useCallback(() => {
    setState({ kind: "loading" });
    void requestPlayback(lessonId, locale).then(setState);
  }, [lessonId, locale]);

  if (state.kind !== "ready") {
    const Icon = state.kind === "unavailable" ? Hourglass : state.kind === "error" ? Lock : null;
    return (
      <div className="lesson-player lesson-player-message" aria-busy={state.kind === "loading"}>
        {state.kind === "loading" ? (
          <span className="lesson-player-spinner" role="status" aria-label={t("videoLoading")} />
        ) : (
          <div role="alert">
            {Icon && <Icon size={28} aria-hidden="true" />}
            <p>{state.kind === "unavailable" ? t("videoProcessing") : t("videoError")}</p>
            <button type="button" className="btn outline" onClick={() => void load()}>
              <RotateCcw size={16} aria-hidden="true" /> {t("retry")}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lesson-player">
      <MuxPlayer
        playbackId={state.playback.playbackId}
        tokens={state.playback.tokens}
        streamType="on-demand"
        accentColor="#0066ff"
        metadata={{ video_title: title }}
        playbackRates={[0.75, 1, 1.25, 1.5, 1.75, 2]}
        style={{ aspectRatio: "16 / 9", width: "100%" }}
        onPlay={() => setEnded(false)}
        onEnded={() => setEnded(true)}
        onError={() => {
          // Tokens last five minutes; one silent refresh covers an expired session.
          if (retried.current) return;
          retried.current = true;
          void load();
        }}
      />
      {ended && next && (
        <div className="lesson-up-next" role="status">
          <small>{t("upNext")}</small>
          <strong dir="auto">{next.title}</strong>
          <Link className="btn" href={next.href}>
            {t("playNext")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
