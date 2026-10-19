"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, Lock, RotateCcw, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { courseHref } from "@/features/courses/components/course-links";
import {
  BODY_MAX,
  type ThreadDetail,
  type ThreadMessage,
  type ThreadSummary,
} from "../types";
import {
  loadThreadAction,
  markThreadReadAction,
  sendMessageAction,
  setThreadStatusAction,
  type MessageError,
} from "../server/actions";

const THREAD_POLL_MS = 15_000;

type Patch = Partial<
  Pick<
    ThreadSummary,
    | "status"
    | "unread"
    | "lastBody"
    | "lastFromMe"
    | "lastIsStaff"
    | "lastMessageAt"
  >
>;

/** Keeps older pages the learner already loaded when a fresh newest page arrives. */
function merge(
  current: ThreadDetail | null,
  fresh: ThreadDetail,
): ThreadDetail {
  if (!current) return fresh;
  const first = fresh.messages[0]?.createdAt;
  const older = first
    ? current.messages.filter(
        (m) =>
          m.createdAt < first && !fresh.messages.some((f) => f.id === m.id),
      )
    : [];
  return {
    ...fresh,
    hasMore: older.length ? current.hasMore : fresh.hasMore,
    messages: [...older, ...fresh.messages],
  };
}

export function ThreadView({
  id,
  timeZone,
  onBack,
  onChange,
}: {
  id: string;
  timeZone: string;
  onBack: () => void;
  onChange: (id: string, patch: Patch) => void;
}) {
  const t = useTranslations("messaging");
  const format = useFormatter();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState<MessageError | null>(null);
  const [actionError, setActionError] = useState<MessageError | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const [olderPending, startOlder] = useTransition();
  const logRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  // How the scroll position should react to the next render of the message log.
  const scrollMode = useRef<"bottom" | "keep" | "follow" | { height: number }>(
    "bottom",
  );
  const lastIncoming = useRef<string | null>(null);

  const apply = useCallback(
    async (
      result: Awaited<ReturnType<typeof loadThreadAction>>,
      mode: "bottom" | "follow",
    ) => {
      if ("error" in result) {
        setError((e) =>
          e === null && mode === "follow" ? null : result.error,
        );
        return;
      }
      setError(null);
      scrollMode.current = mode;
      setThread((current) => merge(current, result.thread));
      // Mark read whenever a message from the other side is new to this view.
      const incoming = [...result.thread.messages]
        .reverse()
        .find((m) => !m.mine);
      if (
        incoming &&
        incoming.id !== lastIncoming.current &&
        document.visibilityState === "visible"
      ) {
        lastIncoming.current = incoming.id;
        if (await markThreadReadAction(id)) onChange(id, { unread: 0 });
      }
    },
    [id, onChange],
  );
  const refresh = useCallback(
    async (mode: "bottom" | "follow") =>
      apply(await loadThreadAction(id), mode),
    [apply, id],
  );

  useEffect(() => {
    void loadThreadAction(id).then((result) => apply(result, "bottom"));
    function poll() {
      if (document.visibilityState === "visible")
        void loadThreadAction(id).then((result) => apply(result, "follow"));
    }
    const timer = window.setInterval(poll, THREAD_POLL_MS);
    document.addEventListener("visibilitychange", poll);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [apply, id]);

  useLayoutEffect(() => {
    const log = logRef.current;
    if (!log || !thread) return;
    const mode = scrollMode.current;
    if (mode === "bottom") log.scrollTop = log.scrollHeight;
    else if (mode === "follow") {
      // Follow new messages only when the reader is already near the end.
      if (log.scrollHeight - log.scrollTop - log.clientHeight < 160)
        log.scrollTop = log.scrollHeight;
    } else if (typeof mode === "object")
      log.scrollTop = log.scrollHeight - mode.height;
    scrollMode.current = "keep";
  }, [thread]);

  function loadOlder() {
    const oldest = thread?.messages[0];
    if (!oldest) return;
    startOlder(async () => {
      const result = await loadThreadAction(id, oldest.createdAt);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      scrollMode.current = { height: logRef.current?.scrollHeight ?? 0 };
      setThread((current) =>
        current
          ? {
              ...current,
              hasMore: result.thread.hasMore,
              messages: [
                ...result.thread.messages.filter(
                  (m) => !current.messages.some((c) => c.id === m.id),
                ),
                ...current.messages,
              ],
            }
          : current,
      );
    });
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending || thread?.status !== "open") return;
    setActionError(null);
    startSending(async () => {
      const result = await sendMessageAction(id, body);
      if ("error" in result) {
        setActionError(result.error);
        if (result.error === "closed") await refresh("follow");
        return;
      }
      setDraft("");
      onChange(id, {
        lastBody: body.slice(0, 160),
        lastFromMe: true,
        lastIsStaff: thread.viewerRole === "staff",
        lastMessageAt: new Date().toISOString(),
        unread: 0,
      });
      await refresh("bottom");
      composerRef.current?.focus();
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) send();
  }

  function setStatus(status: "open" | "closed") {
    setActionError(null);
    startStatus(async () => {
      const result = await setThreadStatusAction(id, status);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      setThread((current) =>
        current
          ? {
              ...current,
              status,
              closedAt: status === "closed" ? new Date().toISOString() : null,
            }
          : current,
      );
      onChange(id, { status });
    });
  }

  const dayOf = (iso: string) =>
    format.dateTime(new Date(iso), {
      timeZone,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      numberingSystem: "latn",
    });
  const timeOf = (iso: string) =>
    format.dateTime(new Date(iso), {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      numberingSystem: "latn",
    });

  if (!thread) {
    return (
      <div className="messages-placeholder">
        {error ? (
          <>
            <p role="alert">
              {error === "notFound" ? t("threadNotFound") : t("threadFailed")}
            </p>
            <div className="messages-placeholder-actions">
              {error !== "notFound" && (
                <button
                  type="button"
                  className="btn outline"
                  onClick={() => void refresh("bottom")}
                >
                  {t("retry")}
                </button>
              )}
              <button type="button" className="btn outline" onClick={onBack}>
                {t("backToInbox")}
              </button>
            </div>
          </>
        ) : (
          <p role="status">{t("loadingThread")}</p>
        )}
      </div>
    );
  }

  const staffView = thread.viewerRole === "staff";
  const otherRead = thread.otherReadAt ? Date.parse(thread.otherReadAt) : 0;
  const lastMine = [...thread.messages].reverse().find((m) => m.mine);
  const nameOf = (m: ThreadMessage) =>
    m.senderName ??
    (m.isStaff
      ? thread.topic === "course"
        ? t("instructor")
        : t("supportTeam")
      : (thread.learnerName ?? t("aLearner")));

  return (
    <div className="messages-conversation">
      <header className="messages-thread-head">
        <button
          type="button"
          className="icon-button messages-back"
          aria-label={t("backToInbox")}
          onClick={onBack}
        >
          <ArrowLeft />
        </button>
        <div className="messages-thread-title">
          <h2 dir="auto">{thread.subject}</h2>
          <p>
            {staffView && (
              <>
                <bdi>{thread.learnerName ?? t("aLearner")}</bdi>
                {" · "}
              </>
            )}
            {thread.topic === "course" && thread.courseSlug ? (
              <Link href={courseHref(thread.courseSlug)}>
                <bdi>{thread.courseTitle ?? t("aCourse")}</bdi>
              </Link>
            ) : (
              <bdi>
                {thread.topic === "course" ? t("aCourse") : t("supportTeam")}
              </bdi>
            )}
            {" · "}
            <span className={`messages-tag ${thread.status}`}>
              {thread.status === "closed" ? t("closed") : t("open")}
            </span>
          </p>
        </div>
        {thread.status === "open" ? (
          <button
            type="button"
            className="btn outline messages-status-btn"
            onClick={() => setStatus("closed")}
            disabled={statusPending}
          >
            <Lock size={15} aria-hidden="true" />
            {t("close")}
          </button>
        ) : (
          <button
            type="button"
            className="btn outline messages-status-btn"
            onClick={() => setStatus("open")}
            disabled={statusPending}
          >
            <RotateCcw size={15} aria-hidden="true" />
            {t("reopen")}
          </button>
        )}
      </header>

      <div
        className="messages-log"
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label={t("historyLabel")}
        tabIndex={0}
      >
        {thread.hasMore && (
          <button
            type="button"
            className="messages-older text-link"
            onClick={loadOlder}
            disabled={olderPending}
          >
            {olderPending ? t("loadingOlder") : t("loadOlder")}
          </button>
        )}
        {thread.messages.map((m, i) => {
          const day = dayOf(m.createdAt);
          const newDay =
            i === 0 || dayOf(thread.messages[i - 1].createdAt) !== day;
          const sameSender =
            !newDay &&
            i > 0 &&
            thread.messages[i - 1].mine === m.mine &&
            thread.messages[i - 1].senderName === m.senderName &&
            Date.parse(m.createdAt) -
              Date.parse(thread.messages[i - 1].createdAt) <
              5 * 60_000;
          return (
            <Fragment key={m.id}>
              {newDay && (
                <p className="messages-day">
                  <span>{day}</span>
                </p>
              )}
              <article
                className={`messages-bubble ${m.mine ? "mine" : "theirs"} ${sameSender ? "grouped" : ""}`}
              >
                {!m.mine && !sameSender && (
                  <header>
                    <bdi>{nameOf(m)}</bdi>
                    {m.isStaff && (
                      <span className="messages-staff">{t("staffBadge")}</span>
                    )}
                  </header>
                )}
                <p dir="auto">{m.body}</p>
                <footer>
                  <time dateTime={m.createdAt}>{timeOf(m.createdAt)}</time>
                  {m === lastMine && otherRead >= Date.parse(m.createdAt) && (
                    <span className="messages-seen">{t("seen")}</span>
                  )}
                </footer>
              </article>
            </Fragment>
          );
        })}
      </div>

      {actionError && (
        <p className="messages-state error" role="alert">
          {t(`errors.${actionError}`)}
        </p>
      )}

      {thread.status === "open" ? (
        <form className="messages-composer" onSubmit={send}>
          <label className="visually-hidden" htmlFor={`reply-${id}`}>
            {t("replyLabel")}
          </label>
          <textarea
            id={`reply-${id}`}
            ref={composerRef}
            value={draft}
            maxLength={BODY_MAX}
            rows={3}
            dir="auto"
            placeholder={
              staffView ? t("replyStaffPlaceholder") : t("replyPlaceholder")
            }
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
          />
          <div className="messages-composer-bar">
            {draft.length > BODY_MAX - 500 ? (
              <small>
                {t("charactersLeft", { count: BODY_MAX - draft.length })}
              </small>
            ) : (
              <small className="messages-hint">{t("sendHint")}</small>
            )}
            <button
              type="submit"
              className="btn"
              disabled={sending || !draft.trim()}
            >
              <Send size={16} aria-hidden="true" />
              {sending ? t("sending") : t("send")}
            </button>
          </div>
        </form>
      ) : (
        <div className="messages-closed-note">
          <Lock size={16} aria-hidden="true" />
          <p>{t("closedNote")}</p>
        </div>
      )}
    </div>
  );
}
