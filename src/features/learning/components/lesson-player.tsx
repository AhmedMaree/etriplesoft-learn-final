"use client";

import { useCallback, useEffect, useRef, useState, type ComponentRef } from "react";
import MuxPlayer from "@mux/mux-player-react/lazy";
import { ArrowRight, Hourglass, Lock, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import { BunnyPlayer } from "./bunny-player";

type Playback =
  | { provider: "mux"; playbackId: string; tokens: { playback: string; thumbnail: string; storyboard: string } }
  | { provider: "bunny"; embedUrl: string };
type State = { kind: "loading" } | { kind: "ready"; playback: Playback } | { kind: "unavailable" | "error" };
type SavedProgress = { session_id: string; position_seconds: number; watched_seconds: number; duration_seconds: number; percent: number; completed: boolean };

type Props = {
  lessonId: string;
  locale: Locale;
  title: string;
  next: { href: string; title: string; isPracticeCheck: boolean } | null;
  trackProgress: boolean;
  autoplayNext: boolean;
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
    if (data.provider === "bunny") return { kind: "ready", playback: { provider: "bunny", embedUrl: data.embedUrl } };
    return {
      kind: "ready",
      playback: {
        provider: "mux",
        playbackId: data.playbackId,
        tokens: { playback: data.token, thumbnail: data.thumbnailToken, storyboard: data.storyboardToken },
      },
    };
  } catch {
    return { kind: "error" };
  }
}

/** Requests short-lived signed playback access from the server, then plays the lesson with Mux Player or the Bunny embed. */
export function LessonPlayer({ lessonId, locale, title, next, trackProgress, autoplayNext }: Props) {
  const t = useTranslations("courses");
  const p = useTranslations("learningProgress");
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [ended, setEnded] = useState(false);
  const retried = useRef(false);
  const player = useRef<ComponentRef<typeof MuxPlayer>>(null);
  const session = useRef<SavedProgress | null>(null);
  const [progress, setProgress] = useState<SavedProgress | null>(null);
  const [saveError, setSaveError] = useState(false);
  const sequence = useRef(0);
  const lastCheckpoint = useRef(0);
  const queue = useRef(Promise.resolve());
  const resume = useRef(0);
  const [initialPosition, setInitialPosition] = useState(0);
  const seeking = useRef(false);
  const bunnyPosition = useRef(0);
  const bunnyPlaying = useRef(false);

  // The parent keys this component by lesson, so state starts fresh for every lesson.
  useEffect(() => {
    let active = true;
    void requestPlayback(lessonId, locale).then((result) => {
      if (active) setState(result);
    });
    // Refresh before five-minute expiry without remounting the player or losing position.
    const timer = setInterval(() => {
      void requestPlayback(lessonId, locale).then((result) => {
        if (!active) return;
        // A loaded Bunny embed keeps playing; replacing its URL would reload the iframe.
        if (result.kind === 'ready' || result.kind === 'unavailable') {
          setState((current) => current.kind === 'ready' && current.playback.provider === 'bunny' && result.kind === 'ready' ? current : result);
        } else setSaveError(true);
      });
    }, 240_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [lessonId, locale]);

  useEffect(() => {
    if (!trackProgress) return;
    let active = true;
    void fetch('/api/learning/progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, locale }), cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) throw new Error('progress');
      const value: SavedProgress = await response.json();
      if (!active) return;
      session.current = value; resume.current = Number(value.position_seconds);
      setInitialPosition(resume.current);
      setProgress(value);
      if (player.current && resume.current > 0) player.current.currentTime = resume.current;
    }).catch(() => { if (active) setSaveError(true); });
    return () => { active = false; };
  }, [lessonId, locale, trackProgress]);

  function checkpoint(playing: boolean) {
    const current = session.current;
    const position = state.kind === "ready" && state.playback.provider === "bunny" ? bunnyPosition.current : player.current?.currentTime;
    if (!current || position === undefined || !Number.isFinite(position)) return;
    const seq = ++sequence.current;
    lastCheckpoint.current = Date.now();
    queue.current = queue.current.then(async () => {
      try {
        let response: Response | undefined;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            response = await fetch('/api/learning/progress', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: current.session_id, locale, sequence: seq, position, playing }),
              cache: 'no-store', keepalive: true,
            });
          } catch { response = undefined; }
          if (response?.ok || (response && response.status < 500)) break;
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
        if (!response?.ok) throw new Error('checkpoint');
        const value: Omit<SavedProgress, 'session_id'> = await response.json();
        const updated = { ...value, session_id: current.session_id };
        const newlyCompleted = value.completed && !session.current?.completed;
        session.current = updated; setProgress(updated); setSaveError(false);
        if (newlyCompleted) router.refresh();
      } catch { setSaveError(true); }
    });
  }

  function finish() {
    checkpoint(true);
    checkpoint(false);
    void queue.current.then(() => {
      const completed = session.current?.completed === true;
      const canOpenNext = next && (!next.isPracticeCheck || (trackProgress && completed));
      setEnded(Boolean(canOpenNext));
      if (autoplayNext && canOpenNext) router.push(next.href);
    });
  }

  function onBunnyEvent(event: "play" | "pause" | "timeupdate" | "seeked" | "ended", position: number) {
    bunnyPosition.current = position;
    if (event === "play") { bunnyPlaying.current = true; setEnded(false); checkpoint(true); }
    else if (event === "pause") { checkpoint(true); bunnyPlaying.current = false; checkpoint(false); }
    else if (event === "seeked") { checkpoint(false); if (bunnyPlaying.current) checkpoint(true); }
    else if (event === "timeupdate") { if (bunnyPlaying.current && Date.now() - lastCheckpoint.current >= 5000) checkpoint(true); }
    else { finish(); bunnyPlaying.current = false; }
  }

  const load = useCallback(() => {
    if (player.current) { resume.current = player.current.currentTime; setInitialPosition(resume.current); }
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
      {state.playback.provider === "bunny" ? (
        <BunnyPlayer embedUrl={state.playback.embedUrl} title={title} startAt={initialPosition} onEvent={onBunnyEvent} />
      ) : (
      <MuxPlayer
        ref={player}
        playbackId={state.playback.playbackId}
        tokens={state.playback.tokens}
        streamType="on-demand"
        accentColor="#0066ff"
        metadata={{ video_title: title }}
        playbackRates={[0.75, 1, 1.25, 1.5, 1.75, 2]}
        style={{ aspectRatio: "16 / 9", width: "100%" }}
        startTime={initialPosition}
        onLoadedMetadata={() => { if (player.current && resume.current > 0) player.current.currentTime = resume.current; }}
        onPlay={() => { setEnded(false); checkpoint(true); }}
        onTimeUpdate={() => {
          if (player.current && !player.current.paused && !seeking.current && Date.now() - lastCheckpoint.current >= 5000) checkpoint(true);
        }}
        onPause={() => { checkpoint(true); checkpoint(false); }}
        onSeeking={() => { seeking.current = true; checkpoint(false); }}
        onSeeked={() => { seeking.current = false; checkpoint(!player.current?.paused); }}
        onEnded={finish}
        onError={() => {
          // Tokens last five minutes; one silent refresh covers an expired session.
          if (retried.current) { setState({ kind: 'error' }); return; }
          retried.current = true;
          void load();
        }}
      />
      )}
      {trackProgress && <p className="lesson-saved-progress" role="status">
        {saveError ? p('saveError') : progress ? progress.completed ? p('completed') : p('watched', { percent: progress.percent }) : p('loading')}
      </p>}
      {ended && next && (
        <div className="lesson-up-next" role="status">
          <small>{next.isPracticeCheck ? t("videoPracticeCheck") : t("upNext")}</small>
          <strong dir="auto">{next.title}</strong>
          <Link className="btn" href={next.href}>
            {next.isPracticeCheck ? t("answerVideoQuestions") : t("playNext")} <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
          </Link>
        </div>
      )}
      {trackProgress && next?.isPracticeCheck && progress && !progress.completed && (
        <p className="lesson-saved-progress" role="status">{t("watchMoreForPractice")}</p>
      )}
    </div>
  );
}
