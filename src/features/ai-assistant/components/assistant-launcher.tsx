"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Maximize2, Plus, Send, Square, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ASSET_BASE } from "@/lib/assets";
import { ERROR_KEYS, readErrorCode } from "@/features/ai-assistant/chat-errors";
import type { AssistantMessage, ChatStreamEvent } from "@/features/ai-assistant/types";
import { AiMarkdown } from "./ai-markdown";

type UiMessage = Pick<AssistantMessage, "id" | "role" | "content"> & { pending?: boolean };

const QUICK_PROMPTS = [
  ["promptCrm", "promptCrmText"],
  ["promptQuiz", "promptQuizText"],
  ["recommendNext", "recommendText"],
] as const;

/**
 * Floating AI button for the learner area: a compact General chat over POST /api/ai/chat.
 * The shell keeps it mounted across client navigation, so a conversation follows the learner between pages;
 * the full assistant (course chat, history, deep thinking) stays on /ai-page.
 */
export function AssistantLauncher() {
  const t = useTranslations("ai");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const box = listRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function newChat() {
    abortRef.current?.abort();
    setConversationId(null);
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");
    const userTemp = `user-${Date.now()}`;
    const replyTemp = `reply-${Date.now()}`;
    setMessages((list) => [
      ...list,
      { id: userTemp, role: "user", content: text },
      { id: replyTemp, role: "assistant", content: "", pending: true },
    ]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let reply = "";
    let started = false;
    const patchReply = (patch: Partial<UiMessage>) =>
      setMessages((list) => list.map((m) => (m.id === replyTemp ? { ...m, ...patch } : m)));
    const dropReply = () => setMessages((list) => list.filter((m) => m.id !== replyTemp));
    const restoreQuestion = () => {
      setMessages((list) => list.filter((m) => m.id !== replyTemp && m.id !== userTemp));
      setInput(text);
    };
    // Ends this turn once, on "done" or when the stream finishes; a newer turn's state is left alone.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (abortRef.current === controller) abortRef.current = null;
      setMessages((list) => list.map((m) => (m.id === replyTemp && m.content ? { ...m, pending: false } : m)));
      setStreaming(false);
    };

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, message: text, conversationId, kind: "general", courseSlug: null, mode: "fast" }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        restoreQuestion();
        setError(t(ERROR_KEYS[readErrorCode(await response.json().catch(() => null))]));
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        let boundary: number;
        while ((boundary = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 1);
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ChatStreamEvent;
          if (event.type === "start") {
            started = true;
            setConversationId(event.conversationId);
          } else if (event.type === "delta") {
            reply += event.text;
            patchReply({ content: reply });
          } else if (event.type === "done") {
            patchReply({ id: event.messageId, pending: false });
            // The reply is saved; the stream may still carry a late title, which this panel does not show.
            release();
          } else if (event.type === "error") {
            dropReply();
            setError(t(ERROR_KEYS[event.code] ?? "errorGeneric"));
          }
        }
      }
    } catch {
      if (released) return;
      if (controller.signal.aborted) {
        // The server keeps a partial reply as "stopped"; an empty one is not saved.
        if (reply) patchReply({ pending: false });
        else dropReply();
      } else {
        dropReply();
        if (!started) restoreQuestion();
        setError(t("errorGeneric"));
      }
    } finally {
      release();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (streaming) abortRef.current?.abort();
    else void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      {open && (
        <section
          id="ai-launcher-panel"
          className="ai-launcher-panel"
          role="dialog"
          aria-labelledby="ai-launcher-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <header className="ai-launcher-head">
            <Image className="bot-avatar" src={ASSET_BASE + "ai-character.png"} alt="" width={36} height={36} />
            <h2 id="ai-launcher-title">{t("assistantName")}</h2>
            <button type="button" className="chat-icon-button" aria-label={t("newChat")} title={t("newChat")} onClick={newChat} disabled={!conversationId && messages.length === 0}>
              <Plus size={17} aria-hidden="true" />
            </button>
            <Link className="chat-icon-button" href="/ai-page" aria-label={t("openFullAssistant")} title={t("openFullAssistant")} onClick={() => setOpen(false)}>
              <Maximize2 size={16} aria-hidden="true" />
            </Link>
            <button type="button" className="chat-icon-button" aria-label={t("closeAssistant")} title={t("closeAssistant")} onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="ai-launcher-messages" ref={listRef} role="log" aria-live="polite" aria-busy={streaming}>
            <div className="message assistant">
              <div>
                <div className="bubble md">
                  <p>
                    <strong>{t("welcomeTitle")}</strong>
                  </p>
                  <p>{t("welcomeBody")}</p>
                </div>
              </div>
            </div>
            {messages.length === 0 && (
              <div className="ai-launcher-prompts">
                {QUICK_PROMPTS.map(([label, text]) => (
                  <button type="button" key={label} onClick={() => send(t(text))}>
                    {t(label)}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m) => (
              <div className={"message " + m.role} key={m.id}>
                <div>
                  {m.role === "assistant" ? (
                    <div className="bubble md" dir="auto">
                      {m.content ? (
                        <AiMarkdown text={m.content} />
                      ) : (
                        <span className="typing-dots" role="img" aria-label={t("typing")}>
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="bubble" dir="auto">{m.content}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p className="chat-error" role="alert">
              {error}
            </p>
          )}
          <form className="chat-input" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={4000}
              dir="auto"
              aria-label={t("askLabel")}
              placeholder={t("placeholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="submit" className={"send-button" + (streaming ? " stop" : "")} aria-label={streaming ? t("stop") : t("send")} disabled={!streaming && !input.trim()}>
              {streaming ? <Square size={15} fill="currentColor" aria-hidden="true" /> : <Send size={18} className="flip-rtl" aria-hidden="true" />}
            </button>
          </form>
          <small className="ai-disclaimer">{t("disclaimer")}</small>
        </section>
      )}
      <button
        ref={buttonRef}
        type="button"
        className={"ai-launcher" + (open ? " open" : "")}
        aria-label={open ? t("closeAssistant") : t("askLabel")}
        title={open ? t("closeAssistant") : t("askLabel")}
        aria-expanded={open}
        aria-controls={open ? "ai-launcher-panel" : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <X size={26} aria-hidden="true" /> : <Image src={ASSET_BASE + "ai-character.png"} alt="" width={52} height={52} />}
      </button>
    </>
  );
}
