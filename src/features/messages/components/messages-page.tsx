"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  BookOpen,
  Inbox,
  LifeBuoy,
  MessageSquarePlus,
  Search,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/primitives";
import {
  THREAD_FILTERS,
  THREAD_PAGE_SIZE,
  SEARCH_MAX,
  type CourseOption,
  type InboxSummary,
  type MessageBox,
  type ThreadFilter,
  type ThreadSummary,
  type ThreadTopic,
} from "../types";
import { loadThreadsAction } from "../server/actions";
import { ThreadView } from "./thread-view";
import { NewThreadDialog } from "./new-thread-dialog";
import "../messages.css";

const LIST_POLL_MS = 30_000;

export function MessagesPage({
  timeZone,
  initialBox,
  initialThreads,
  initialHasMore,
  initialSummary,
  initialThreadId,
  courses,
  initialCompose,
  loadFailed,
}: {
  timeZone: string;
  initialBox: MessageBox;
  initialThreads: ThreadSummary[];
  initialHasMore: boolean;
  initialSummary: InboxSummary;
  initialThreadId: string | null;
  courses: CourseOption[];
  /** Opens the new-message dialog on load (from a course page or help link). */
  initialCompose: { topic: ThreadTopic; courseId: string | null } | null;
  loadFailed: boolean;
}) {
  const t = useTranslations("messaging");
  const format = useFormatter();
  const [box, setBox] = useState<MessageBox>(initialBox);
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState(initialThreads);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [summary, setSummary] = useState(initialSummary);
  const [selected, setSelected] = useState<string | null>(initialThreadId);
  const [failed, setFailed] = useState(loadFailed);
  const [compose, setCompose] = useState(initialCompose);
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  // The latest query, so a slow response for an older query never overwrites a newer one.
  const query = useRef({ box, filter, search });
  const threadsRef = useRef(threads);
  useEffect(() => {
    query.current = { box, filter, search };
    threadsRef.current = threads;
  });

  const reload = useCallback(
    (next: { box: MessageBox; filter: ThreadFilter; search: string }) => {
      startTransition(async () => {
        const result = await loadThreadsAction(
          next.box,
          next.filter,
          next.search,
        );
        const current = query.current;
        if (
          current.box !== next.box ||
          current.filter !== next.filter ||
          current.search !== next.search
        )
          return;
        if ("error" in result) {
          setFailed(true);
          return;
        }
        setFailed(false);
        setThreads(result.threads);
        setHasMore(result.hasMore);
        setSummary(result.summary);
        setLoadedAt(Date.now());
      });
    },
    [],
  );

  function loadMore() {
    startTransition(async () => {
      const result = await loadThreadsAction(
        box,
        filter,
        search,
        threads.length,
      );
      if ("error" in result) {
        setFailed(true);
        return;
      }
      setThreads((list) => [
        ...list,
        ...result.threads.filter((t) => !list.some((x) => x.id === t.id)),
      ]);
      setHasMore(result.hasMore);
      setSummary(result.summary);
    });
  }

  // Debounced search.
  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const timer = window.setTimeout(
      () => reload({ ...query.current, search }),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search, reload]);

  // Background refresh while the tab is visible.
  useEffect(() => {
    function refresh() {
      // Refreshing returns the first page only, so it would drop pages loaded with "Load more".
      if (
        document.visibilityState === "visible" &&
        threadsRef.current.length <= THREAD_PAGE_SIZE
      )
        reload(query.current);
    }
    const timer = window.setInterval(refresh, LIST_POLL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);

  // Keep ?thread= and ?box= in the address bar without re-rendering the server page.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("new");
    if (selected) url.searchParams.set("thread", selected);
    else url.searchParams.delete("thread");
    if (box === "staff") url.searchParams.set("box", "staff");
    else url.searchParams.delete("box");
    if (url.href !== window.location.href)
      window.history.replaceState(null, "", url.href);
  }, [selected, box]);

  function changeBox(next: MessageBox) {
    if (next === box) return;
    const nextFilter =
      filter === "awaiting" && next === "mine" ? "all" : filter;
    setBox(next);
    setFilter(nextFilter);
    setSelected(null);
    setThreads([]);
    reload({ box: next, filter: nextFilter, search });
  }

  function changeFilter(next: ThreadFilter) {
    setFilter(next);
    reload({ box, filter: next, search });
  }

  // Called by the thread view whenever it reads, sends or changes the status.
  const onThreadChange = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          ThreadSummary,
          | "status"
          | "unread"
          | "lastBody"
          | "lastFromMe"
          | "lastIsStaff"
          | "lastMessageAt"
        >
      >,
    ) => {
      const before = threadsRef.current.find((x) => x.id === id);
      if (before && before.unread > 0 && patch.unread === 0)
        setSummary((s) =>
          box === "mine"
            ? { ...s, unreadMine: Math.max(0, s.unreadMine - 1) }
            : { ...s, unreadStaff: Math.max(0, s.unreadStaff - 1) },
        );
      setThreads((list) => {
        const index = list.findIndex((x) => x.id === id);
        if (index < 0) return list;
        const updated = { ...list[index], ...patch };
        const next = [...list];
        next[index] = updated;
        // A new message moves the conversation to the top.
        if (patch.lastMessageAt && index > 0) {
          next.splice(index, 1);
          next.unshift(updated);
        }
        return next;
      });
    },
    [box],
  );

  function openCompose() {
    setCompose({
      topic: courses.length ? "course" : "support",
      courseId: null,
    });
  }

  function onStarted(id: string) {
    setCompose(null);
    setBox("mine");
    setFilter("all");
    setSearch("");
    setSelected(id);
    reload({ box: "mine", filter: "all", search: "" });
  }

  const filters = THREAD_FILTERS.filter(
    (f) => f !== "awaiting" || box === "staff",
  );
  const searching = search.trim() !== "" || filter !== "all";

  return (
    <div className={`messages-layout ${selected ? "has-thread" : ""}`}>
      <section
        className="panel messages-inbox"
        aria-labelledby="messages-inbox-title"
      >
        <div className="messages-inbox-head">
          <h2 id="messages-inbox-title">{t("inboxTitle")}</h2>
          {box === "mine" && (
            <Button className="messages-new" onClick={openCompose}>
              <MessageSquarePlus size={17} aria-hidden="true" />
              {t("newMessage")}
            </Button>
          )}
        </div>
        {summary.isStaff && (
          <div
            className="messages-boxes"
            role="tablist"
            aria-label={t("boxesLabel")}
          >
            {(["mine", "staff"] as const).map((b) => {
              const unread =
                b === "mine" ? summary.unreadMine : summary.unreadStaff;
              return (
                <button
                  key={b}
                  type="button"
                  role="tab"
                  aria-selected={box === b}
                  className={box === b ? "selected" : ""}
                  onClick={() => changeBox(b)}
                >
                  {t(`boxes.${b}`)}
                  {unread > 0 && (
                    <span
                      className="messages-count"
                      aria-label={t("unreadCount", { count: unread })}
                    >
                      {format.number(unread, { numberingSystem: "latn" })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <label className="messages-search">
          <Search size={17} aria-hidden="true" />
          <span className="visually-hidden">{t("searchLabel")}</span>
          <input
            type="search"
            value={search}
            maxLength={SEARCH_MAX}
            placeholder={
              box === "staff"
                ? t("searchStaffPlaceholder")
                : t("searchPlaceholder")
            }
            onChange={(e) => setSearch(e.target.value)}
            dir="auto"
          />
        </label>
        <div
          className="messages-filters"
          role="group"
          aria-label={t("filtersLabel")}
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              className={filter === f ? "selected" : ""}
              onClick={() => changeFilter(f)}
            >
              {t(`filters.${f}`)}
            </button>
          ))}
        </div>
        {failed && (
          <p className="messages-state error" role="alert">
            {t("listFailed")}{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => reload(query.current)}
            >
              {t("retry")}
            </button>
          </p>
        )}
        {!failed && threads.length === 0 && !pending && (
          <div className="messages-state">
            <Inbox size={28} aria-hidden="true" />
            <p>
              {searching
                ? t("noMatches")
                : box === "staff"
                  ? t("emptyStaff")
                  : t("emptyMine")}
            </p>
          </div>
        )}
        <ul className="messages-list" aria-busy={pending}>
          {threads.map((thread) => (
            <li key={thread.id}>
              <button
                type="button"
                className={`messages-item ${selected === thread.id ? "selected" : ""} ${thread.unread ? "unread" : ""}`}
                aria-current={selected === thread.id ? "true" : undefined}
                onClick={() => setSelected(thread.id)}
              >
                <span
                  className={`messages-avatar ${thread.topic}`}
                  aria-hidden="true"
                >
                  {thread.topic === "course" ? (
                    <BookOpen size={18} />
                  ) : (
                    <LifeBuoy size={18} />
                  )}
                </span>
                <span className="messages-item-body">
                  <span className="messages-item-top">
                    <strong dir="auto">{thread.subject}</strong>
                    <time dateTime={thread.lastMessageAt}>
                      {format.relativeTime(
                        new Date(thread.lastMessageAt),
                        loadedAt,
                      )}
                    </time>
                  </span>
                  <span className="messages-item-meta" dir="auto">
                    {box === "staff" && (
                      <>
                        <bdi>{thread.learnerName ?? t("aLearner")}</bdi>
                        {" · "}
                      </>
                    )}
                    <bdi>
                      {thread.topic === "course"
                        ? (thread.courseTitle ?? t("aCourse"))
                        : t("supportTeam")}
                    </bdi>
                  </span>
                  <span className="messages-item-preview">
                    {thread.lastFromMe && <span>{t("you")} </span>}
                    <span dir="auto">{thread.lastBody}</span>
                  </span>
                  {(thread.status === "closed" ||
                    (box === "staff" &&
                      thread.status === "open" &&
                      !thread.lastIsStaff)) && (
                    <span
                      className={`messages-tag ${thread.status === "closed" ? "closed" : "awaiting"}`}
                    >
                      {thread.status === "closed"
                        ? t("closed")
                        : t("awaitingReply")}
                    </span>
                  )}
                </span>
                {thread.unread > 0 && (
                  <span
                    className="messages-count"
                    aria-label={t("unreadCount", { count: thread.unread })}
                  >
                    {thread.unread > 99
                      ? "99+"
                      : format.number(thread.unread, {
                          numberingSystem: "latn",
                        })}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            className="messages-more text-link"
            onClick={loadMore}
            disabled={pending}
          >
            {t("loadMore")}
          </button>
        )}
      </section>
      <section className="panel messages-thread" aria-label={t("conversation")}>
        {selected ? (
          <ThreadView
            key={selected}
            id={selected}
            timeZone={timeZone}
            onBack={() => setSelected(null)}
            onChange={onThreadChange}
          />
        ) : (
          <div className="messages-placeholder">
            <span className="messages-placeholder-icon" aria-hidden="true">
              <Inbox size={30} />
            </span>
            <h2>{t("selectTitle")}</h2>
            <p>{box === "staff" ? t("selectStaffCopy") : t("selectCopy")}</p>
            {box === "mine" && (
              <Button onClick={openCompose}>
                <MessageSquarePlus size={17} aria-hidden="true" />
                {t("newMessage")}
              </Button>
            )}
          </div>
        )}
      </section>
      {compose && (
        <NewThreadDialog
          courses={courses}
          initial={compose}
          onClose={() => setCompose(null)}
          onStarted={onStarted}
        />
      )}
    </div>
  );
}
