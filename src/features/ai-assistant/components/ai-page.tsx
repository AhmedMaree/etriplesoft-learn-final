"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  Clock,
  Copy,
  FileText,
  Filter,
  GraduationCap,
  Info,
  Lightbulb,
  MessageSquare,
  Paperclip,
  Plus,
  Receipt,
  Send,
  Square,
  Target,
  Trash2,
  Trophy,
  Warehouse,
  Code2,
  ListChecks,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { Panel, Title, IconBox } from "@/components/ui/primitives";
import { Avatar } from "@/components/shared/profile-avatar";
import { Link } from "@/i18n/navigation";
import { courseHref, lessonHref } from "@/features/courses/components/course-links";
import { ASSET_BASE } from "@/lib/assets";
import type {
  AssistantInsights,
  AssistantMessage,
  ChatKind,
  ChatSource,
  ChatStreamEvent,
  ContextCourse,
  ConversationSummary,
} from "@/features/ai-assistant/types";
import { ERROR_KEYS, readErrorCode } from "@/features/ai-assistant/chat-errors";
import { AiMarkdown } from "./ai-markdown";

type UiMessage = AssistantMessage & { pending?: boolean; fallback?: boolean };
type PromptKey =
  | "Crm" | "SummarizeCourse" | "Quiz" | "Recommend" | "Prepare" | "Domains" | "Inventory" | "Model"
  | "Invoice" | "StudyPlan" | "CourseQuiz" | "KeySteps";

const PROMPTS: Record<ChatKind, { primary: [PromptKey, LucideIcon][]; more: [PromptKey, LucideIcon][] }> = {
  general: {
    primary: [["Crm", BookOpen], ["Quiz", GraduationCap], ["Recommend", BarChart3], ["Domains", Filter], ["Model", Code2]],
    more: [["Inventory", Warehouse], ["Invoice", Receipt]],
  },
  course: {
    primary: [["SummarizeCourse", FileText], ["KeySteps", ListChecks], ["CourseQuiz", GraduationCap], ["StudyPlan", CalendarDays], ["Prepare", Target]],
    more: [],
  },
};
const RECENT_LIMIT = 5;

export function AIPage({
  configured,
  courses,
  initialConversations,
  insights: initialInsights,
  avatarUrl,
}: {
  configured: boolean;
  courses: ContextCourse[];
  initialConversations: ConversationSummary[];
  insights: AssistantInsights;
  avatarUrl: string | null;
}) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const format = useFormatter();

  const [conversations, setConversations] = useState(initialConversations);
  const [insights, setInsights] = useState(initialInsights);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<ChatKind>("general");
  const [courseSlug, setCourseSlug] = useState(courses[0]?.slug ?? null);
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState<"idle" | "streaming" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [morePrompts, setMorePrompts] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const course = courses.find((c) => c.slug === courseSlug) ?? null;
  const activeTitle = conversations.find((c) => c.id === activeId)?.title ?? t("newConversation");
  const courseChatReady = kind === "general" || course !== null;
  const streaming = busy === "streaming";

  useEffect(() => {
    const box = listRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function formatTime(value: string) {
    return format.dateTime(new Date(value), { hour: "numeric", minute: "2-digit" });
  }
  function formatDay(value: string) {
    const date = new Date(value);
    const day = (d: Date) => format.dateTime(d, { year: "numeric", month: "numeric", day: "numeric" });
    return day(date) === day(new Date()) ? t("today") : format.dateTime(date, { month: "short", day: "numeric" });
  }

  function upsertConversation(id: string, patch: Partial<ConversationSummary>) {
    setConversations((list) => {
      const existing = list.find((c) => c.id === id);
      const next: ConversationSummary = {
        id,
        kind: existing?.kind ?? kind,
        courseId: existing?.courseId ?? (kind === "course" ? (course?.id ?? null) : null),
        title: existing?.title ?? "",
        preview: existing?.preview ?? "",
        updatedAt: new Date().toISOString(),
        ...patch,
      };
      return [next, ...list.filter((c) => c.id !== id)];
    });
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy !== "idle" || !configured || !courseChatReady) return;
    setError(null);
    setInput("");
    const now = new Date().toISOString();
    const userTemp = `user-${Date.now()}`;
    const replyTemp = `reply-${Date.now()}`;
    setMessages((list) => [
      ...list,
      { id: userTemp, role: "user", content: text, status: "complete", createdAt: now },
      { id: replyTemp, role: "assistant", content: "", status: "complete", createdAt: now, pending: true },
    ]);
    setBusy("streaming");
    const controller = new AbortController();
    abortRef.current = controller;
    let conversationId = activeId;
    let reply = "";
    let started = false;
    const dropReply = () => setMessages((list) => list.filter((m) => m.id !== replyTemp));
    const patchReply = (patch: Partial<UiMessage>) =>
      setMessages((list) => list.map((m) => (m.id === replyTemp ? { ...m, ...patch } : m)));
    // Ends this turn once, on "done" or when the stream finishes; a newer turn's state is left alone.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      if (abortRef.current === controller) abortRef.current = null;
      setMessages((list) => list.map((m) => (m.id === replyTemp && m.content ? { ...m, pending: false } : m)));
      setBusy("idle");
      inputRef.current?.focus({ preventScroll: true });
    };

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          message: text,
          conversationId,
          kind,
          courseSlug: kind === "course" && course ? course.slug : null,
          mode: deep ? "deep" : "fast",
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const code = readErrorCode(await response.json().catch(() => null));
        setMessages((list) => list.filter((m) => m.id !== replyTemp && m.id !== userTemp));
        setInput(text);
        setError(t(ERROR_KEYS[code]));
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
            conversationId = event.conversationId;
            setActiveId(event.conversationId);
            setMessages((list) => list.map((m) => (m.id === userTemp ? { ...m, id: event.userMessageId } : m)));
            if (event.created) upsertConversation(event.conversationId, { title: text.replace(/\s+/g, " ").slice(0, 80) });
            setInsights((value) => ({
              ...value,
              questions: value.questions + 1,
              questionsThisWeek: value.questionsThisWeek + 1,
              conversations: value.conversations + (event.created ? 1 : 0),
              sessions: Math.max(value.sessions, 1),
            }));
          } else if (event.type === "sources") {
            patchReply({ sources: event.sources });
          } else if (event.type === "delta") {
            reply += event.text;
            patchReply({ content: reply });
          } else if (event.type === "title" && conversationId) {
            upsertConversation(conversationId, { title: event.title });
          } else if (event.type === "done") {
            patchReply({ id: event.messageId, status: event.status, pending: false, fallback: event.fallback });
            if (conversationId) upsertConversation(conversationId, { preview: reply.replace(/[#*`>_|~]+/g, "").replace(/\s+/g, " ").slice(0, 140) });
            // The reply is saved; keep reading only for a late "title" event without blocking the composer.
            release();
          } else if (event.type === "error") {
            dropReply();
            setError(t(ERROR_KEYS[event.code] ?? "errorGeneric"));
          }
        }
      }
    } catch {
      if (released) return; // the reply was already saved; only the optional title was lost
      if (controller.signal.aborted) {
        // The server saves a partial reply as "stopped"; an empty one is not saved.
        if (reply) patchReply({ status: "stopped", pending: false });
        else dropReply();
      } else {
        dropReply();
        if (!started) {
          setMessages((list) => list.filter((m) => m.id !== userTemp));
          setInput(text);
        }
        setError(t("errorGeneric"));
      }
    } finally {
      release();
    }
  }

  async function openConversation(id: string) {
    if (busy !== "idle" || id === activeId) return;
    setBusy("loading");
    setError(null);
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const code = readErrorCode(body);
        if (code === "notFound") setConversations((list) => list.filter((c) => c.id !== id));
        setError(t(code === "notFound" ? "errorNotFound" : code === "authentication" ? "errorAuthentication" : "errorLoad"));
        return;
      }
      const loaded = body && typeof body === "object" ? Reflect.get(body, "messages") : null;
      setMessages(Array.isArray(loaded) ? (loaded as AssistantMessage[]) : []);
      setActiveId(id);
      const summary = conversations.find((c) => c.id === id);
      if (summary) {
        setKind(summary.kind);
        const owner = courses.find((c) => c.id === summary.courseId);
        if (owner) setCourseSlug(owner.slug);
      }
    } catch {
      setError(t("errorLoad"));
    } finally {
      setBusy("idle");
    }
  }

  async function removeConversation(id: string) {
    if (busy !== "idle" || !window.confirm(t("deleteConfirm"))) return;
    setError(null);
    try {
      const response = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) throw new Error("delete");
      setConversations((list) => list.filter((c) => c.id !== id));
      setInsights((value) => ({ ...value, conversations: Math.max(0, value.conversations - 1) }));
      if (id === activeId) newChat();
    } catch {
      setError(t("errorDelete"));
    }
  }

  // Switching tab or course keeps the page where it is; only "New chat" moves focus to the composer.
  function switchKind(next: ChatKind) {
    if (next === kind) return;
    newChat(false);
    setKind(next);
    setMorePrompts(false);
  }

  function chooseCourse(slug: string) {
    if (slug === courseSlug) return;
    if (kind === "course") newChat(false);
    setCourseSlug(slug);
  }

  function newChat(focus = true) {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setError(null);
    if (focus) inputRef.current?.focus({ preventScroll: true });
  }

  async function copyReply(message: UiMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId((id) => (id === message.id ? null : id)), 1600);
    } catch {
      // Clipboard access can be denied; nothing else to do.
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

  const trend =
    insights.questionsLastWeek > 0
      ? Math.round(((insights.questionsThisWeek - insights.questionsLastWeek) / insights.questionsLastWeek) * 100)
      : null;
  const kindConversations = conversations.filter((c) => c.kind === kind && (kind === "general" || c.courseId === course?.id));
  const visibleConversations = showAll ? kindConversations : kindConversations.slice(0, RECENT_LIMIT);
  const promptSet = PROMPTS[kind];
  const prompts = morePrompts ? [...promptSet.primary, ...promptSet.more] : promptSet.primary;
  const promptLabel = (key: PromptKey) =>
    key === "Recommend" ? t("recommendNext") : key === "Prepare" ? t("prepareAssessment") : t(`prompt${key}`);
  const promptText = (key: PromptKey) =>
    key === "Recommend" ? t("recommendText") : key === "Prepare" ? t("prepareText") : t(`prompt${key}Text`);
  const features: [LucideIcon, string][] = [
    [Lightbulb, t("featureAnswers")],
    [BarChart3, t("featureRecommendations")],
    [FileText, t("featureExplanations")],
    [GraduationCap, t("featureGoals")],
  ];

  return (
    <div className="columns">
      <div className="primary">
        <section className="hero ai-hero">
          <Image src={ASSET_BASE + "ai-character.png"} alt="" width={512} height={512} loading="eager" />
          <div className="hero-copy">
            <div className="eyebrow">{t("heroEyebrow")}</div>
            <h2>{t("heroTitle")}</h2>
            <p>{t("heroCopy")}</p>
          </div>
          <div className="ai-features">
            {features.map(([Icon, label], i) => (
              <div key={label}>
                <IconBox icon={Icon} color={i % 3 === 0 ? "green" : "blue"} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>
        <Panel className="chat-panel">
          <div className="chat-tabs" role="tablist" aria-label={t("chatTabsLabel")}>
            {(["general", "course"] as const).map((value) => {
              const Icon = value === "general" ? MessageSquare : BookOpen;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  id={`ai-tab-${value}`}
                  aria-selected={kind === value}
                  aria-controls="ai-chat-region"
                  className={kind === value ? "active" : undefined}
                  onClick={() => switchKind(value)}
                  disabled={busy !== "idle"}
                >
                  <Icon size={17} aria-hidden="true" />
                  {t(value === "general" ? "chatGeneral" : "chatCourse")}
                </button>
              );
            })}
          </div>
          <div id="ai-chat-region" role="tabpanel" aria-labelledby={`ai-tab-${kind}`}>
          {kind === "course" && course && (
            <div className="chat-course-banner">
              <div className="chat-course-row">
                <BookOpen size={15} aria-hidden="true" />
                <span>{t("courseChatBanner")}</span>
                {courses.length > 1 ? (
                  <select className="context-select" aria-label={t("courseSelect")} value={course.slug} onChange={(e) => chooseCourse(e.target.value)} disabled={busy !== "idle"}>
                    {courses.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <b>{course.title}</b>
                )}
                <small>{t("lessonsProgress", { finished: course.finished, required: course.required })}</small>
              </div>
              <p>{t("courseChatInfo")}</p>
            </div>
          )}
          <div className="chat-toolbar">
            <h2 title={activeTitle}>{activeTitle}</h2>
            <label className="chat-mode" title={t("deepModeHint")}>
              <Brain size={17} aria-hidden="true" />
              <span>{t("deepMode")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={deep}
                aria-label={t("deepMode")}
                aria-describedby="ai-deep-hint"
                className={"switch " + (deep ? "on" : "")}
                onClick={() => setDeep(!deep)}
                disabled={streaming}
              />
              <span id="ai-deep-hint" className="visually-hidden">{t("deepModeHint")}</span>
            </label>
            {activeId && (
              <button type="button" className="chat-icon-button" aria-label={t("deleteConversation")} title={t("deleteConversation")} onClick={() => removeConversation(activeId)} disabled={busy !== "idle"}>
                <Trash2 size={17} aria-hidden="true" />
              </button>
            )}
            <button type="button" className="btn outline chat-new" onClick={() => newChat()} disabled={busy === "loading" || (!activeId && messages.length === 0)}>
              <Plus size={16} aria-hidden="true" />
              {t("newChat")}
            </button>
          </div>
          <span className="today-label">{messages[0] ? formatDay(messages[0].createdAt) : t("today")}</span>
          <div className="chat-messages" ref={listRef} role="log" aria-live="polite" aria-busy={busy !== "idle"} aria-label={activeTitle}>
            <div className="message assistant">
              <Image className="bot-avatar" src={ASSET_BASE + "ai-character.png"} alt={t("assistantName")} width={46} height={46} />
              <div>
                <div className="bubble md">
                  <p>
                    <strong>{t("welcomeTitle")}</strong>
                  </p>
                  <p>{t("welcomeBody")}</p>
                </div>
              </div>
            </div>
            {busy === "loading" && <p className="chat-status">{t("loadingConversation")}</p>}
            {messages.map((m) => (
              <div className={"message " + m.role} key={m.id}>
                {m.role === "assistant" ? (
                  <Image className="bot-avatar" src={ASSET_BASE + "ai-character.png"} alt={t("assistantName")} width={46} height={46} />
                ) : (
                  <Avatar src={avatarUrl} alt="" />
                )}
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
                  {m.role === "assistant" && m.sources && <SourceList sources={m.sources} reply={m.content} label={t("sources")} videoLabel={t("sourceVideo")} documentLabel={t("sourceDocument")} />}
                  <div className="message-meta">
                    <small>{formatTime(m.createdAt)}</small>
                    {m.role === "assistant" && m.status === "stopped" && <small className="message-stopped">{t("stopped")}</small>}
                    {m.fallback && <small className="message-stopped">{t("deepFallback")}</small>}
                    {m.role === "assistant" && m.content && !m.pending && (
                      <button type="button" className="message-copy" onClick={() => copyReply(m)} aria-label={copiedId === m.id ? t("copied") : t("copy")} title={copiedId === m.id ? t("copied") : t("copy")}>
                        {copiedId === m.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {error && (
            <p className="chat-error" role="alert">
              {error}
            </p>
          )}
          {/* Starter prompts only on an empty chat; "New chat" brings them back. */}
          {messages.length === 0 && (
            <>
              {promptSet.more.length > 0 ? (
                <Title link={morePrompts ? t("showLess") : t("viewPrompts")} onClick={() => setMorePrompts(!morePrompts)}>
                  {t("tryAsking")}
                </Title>
              ) : (
                <Title>{t("tryAsking")}</Title>
              )}
              <div className={"prompt-grid" + (morePrompts ? " expanded" : "")}>
                {prompts.map(([key, Icon], i) => (
                  <button type="button" onClick={() => send(promptText(key))} key={key} disabled={busy !== "idle" || !configured || !courseChatReady}>
                    <IconBox icon={Icon} color={i % 2 ? "green" : "blue"} />
                    {promptLabel(key)}
                  </button>
                ))}
              </div>
            </>
          )}
          {configured && !courseChatReady ? (
            <div className="chat-unavailable" role="status">
              <Info aria-hidden="true" />
              <div>
                <b>{t("courseChatNeedsEnrollment")}</b>
                <p>
                  <Link href="/courses">{t("browseCourses")}</Link>
                </p>
              </div>
            </div>
          ) : configured ? (
            <form className="chat-input" onSubmit={onSubmit}>
              <Paperclip size={22} aria-hidden="true" />
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={4000}
                dir="auto"
                aria-label={t("askLabel")}
                placeholder={t("placeholderLong")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <button
                type="submit"
                className={"send-button" + (streaming ? " stop" : "")}
                aria-label={streaming ? t("stop") : t("send")}
                disabled={busy === "loading" || (!streaming && !input.trim())}
              >
                {streaming ? <Square size={17} fill="currentColor" aria-hidden="true" /> : <Send size={21} className="flip-rtl" aria-hidden="true" />}
              </button>
            </form>
          ) : (
            <div className="chat-unavailable" role="status">
              <Info aria-hidden="true" />
              <div>
                <b>{t("unavailableTitle")}</b>
                <p>{t("unavailableCopy")}</p>
              </div>
            </div>
          )}
          <small className="ai-disclaimer">{t("disclaimerLong")}</small>
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel>
          {kindConversations.length > RECENT_LIMIT ? (
            <Title link={showAll ? t("showLess") : t("viewAll")} onClick={() => setShowAll(!showAll)}>
              {t("recentConversations")}
            </Title>
          ) : (
            <Title>{t("recentConversations")}</Title>
          )}
          {kindConversations.length === 0 ? (
            <p className="recent-empty">{t("noConversations")}</p>
          ) : (
            <ul className="recent-list">
              {visibleConversations.map((c) => (
                <li key={c.id} className={"recent-item" + (c.id === activeId ? " active" : "")}>
                  <button
                    type="button"
                    className="recent-row"
                    onClick={() => openConversation(c.id)}
                    aria-current={c.id === activeId ? "true" : undefined}
                    aria-label={t("openConversation", { title: c.title })}
                    disabled={busy !== "idle"}
                  >
                    <MessageSquare size={21} aria-hidden="true" />
                    <div>
                      <span dir="auto">{c.title}</span>
                      {c.preview && <small dir="auto">{c.preview}</small>}
                    </div>
                    <small>{formatDay(c.updatedAt)}</small>
                  </button>
                  <button type="button" className="recent-delete" aria-label={`${t("deleteConversation")}: ${c.title}`} onClick={() => removeConversation(c.id)} disabled={busy !== "idle"}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <Title>{t("insights")}</Title>
          <div className="insight">
            <IconBox icon={Clock} />
            <b>{insights.questions}</b>
            <small>{t("questionsAsked")}</small>
            {trend !== null && trend !== 0 && (
              <span className={trend < 0 ? "down" : undefined} title={t(trend > 0 ? "trendUp" : "trendDown", { percent: Math.abs(trend) })}>
                {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                <span className="visually-hidden">{t(trend > 0 ? "trendUp" : "trendDown", { percent: Math.abs(trend) })}</span>
              </span>
            )}
          </div>
          <div className="insight">
            <IconBox icon={BookOpen} />
            <b>{insights.conversations}</b>
            <small>{t("topicsExplored")}</small>
          </div>
          <div className="insight">
            <IconBox icon={GraduationCap} />
            <b>{insights.sessions}</b>
            <small>{t("studySessions")}</small>
          </div>
          <div className="completion">
            <Trophy aria-hidden="true" />
            <div>
              <b>{insights.questions > 0 ? t("curiosity") : t("startTitle")}</b>
              <p>{insights.questions > 0 ? t("keepItUp") : t("startCopy")}</p>
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

/** Citation chips under a Course chat reply: one per lesson, limited to the [n] markers the reply uses. */
function SourceList({ sources, reply, label, videoLabel, documentLabel }: { sources: ChatSource[]; reply: string; label: string; videoLabel: string; documentLabel: string }) {
  const cited = new Set([...reply.matchAll(/\[(\d{1,2})\]/g)].map((match) => Number(match[1])));
  const shown = sources
    .map((source) => ({ ...source, refs: source.refs.filter((n) => cited.has(n)) }))
    .filter((source) => source.refs.length > 0);
  if (!shown.length) return null;
  return (
    <div className="message-sources">
      <small>{label}</small>
      <ul>
        {shown.map((source) => (
          <li key={`${source.lessonId ?? source.label}-${source.refs.join(".")}`}>
            <Link href={source.lessonId ? lessonHref(source.courseSlug, source.lessonId) : courseHref(source.courseSlug)}>
              <span className="source-refs" dir="ltr">{source.refs.map((n) => `[${n}]`).join("")}</span>
              {source.video && <PlayCircle size={13} aria-label={videoLabel} />}
              {source.document && <FileText size={13} aria-label={documentLabel} />}
              <span dir="auto">{source.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
