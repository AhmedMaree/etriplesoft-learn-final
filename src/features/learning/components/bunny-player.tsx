"use client";

import { useEffect, useRef } from "react";

const EMBED_ORIGIN = "https://iframe.mediadelivery.net";
const EVENTS = ["play", "pause", "timeupdate", "seeked", "ended"] as const;
type PlayerEvent = (typeof EVENTS)[number];

type Props = {
  embedUrl: string;
  title: string;
  /** Resume position; applied once, before the learner starts playing. */
  startAt: number;
  onEvent: (event: PlayerEvent, positionSeconds: number) => void;
};

function send(frame: HTMLIFrameElement | null, method: string, value?: unknown, listener?: string) {
  frame?.contentWindow?.postMessage(
    JSON.stringify({ context: "player.js", version: "0.0.11", method, value, listener }),
    EMBED_ORIGIN,
  );
}

/**
 * Bunny Stream embed driven through the Player.js postMessage protocol the Bunny player implements,
 * so lesson progress uses the same checkpoints as Mux Player. Messages from any other frame are ignored.
 */
export function BunnyPlayer({ embedUrl, title, startAt, onEvent }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const started = useRef(false);
  const position = useRef(0);
  const handler = useRef(onEvent);
  const resumeAt = useRef(startAt);
  useEffect(() => { handler.current = onEvent; resumeAt.current = startAt; });

  useEffect(() => {
    ready.current = false;
    started.current = false;
    function receive(message: MessageEvent) {
      if (message.origin !== EMBED_ORIGIN || message.source !== frame.current?.contentWindow) return;
      let data: { context?: string; event?: string; value?: unknown };
      try {
        data = typeof message.data === "string" ? JSON.parse(message.data) : message.data;
      } catch {
        return;
      }
      if (data?.context !== "player.js" || typeof data.event !== "string") return;
      if (data.event === "ready") {
        ready.current = true;
        for (const event of EVENTS) send(frame.current, "addEventListener", event, event);
        if (resumeAt.current > 0) send(frame.current, "setCurrentTime", resumeAt.current);
        return;
      }
      if (!(EVENTS as readonly string[]).includes(data.event)) return;
      const seconds = (data.value as { seconds?: unknown } | undefined)?.seconds;
      if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) position.current = seconds;
      if (data.event === "play") started.current = true;
      handler.current(data.event as PlayerEvent, position.current);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [embedUrl]);

  // Saved progress can arrive after the player is ready.
  useEffect(() => {
    if (ready.current && !started.current && startAt > 0) send(frame.current, "setCurrentTime", startAt);
  }, [startAt]);

  return (
    <iframe
      ref={frame}
      src={embedUrl}
      title={title}
      className="lesson-player-embed"
      style={{ aspectRatio: "16 / 9", width: "100%", border: 0, display: "block" }}
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
