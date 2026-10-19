"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Award,
  Bell,
  CalendarClock,
  CalendarX,
  CheckCheck,
  CircleCheck,
  ClipboardCheck,
  Flame,
  GraduationCap,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  courseHref,
  lessonHref,
} from "@/features/courses/components/course-links";
import type { LearnerNotification, NotificationKind } from "../types";
import {
  loadNotificationsAction,
  markNotificationsReadAction,
  unreadNotificationsAction,
} from "../server/actions";
import "../notifications.css";

const POLL_MS = 120_000;

const ICONS: Record<NotificationKind, { icon: LucideIcon; tone: string }> = {
  enrollment_started: { icon: GraduationCap, tone: "blue" },
  course_completed: { icon: CircleCheck, tone: "green" },
  certificate_issued: { icon: Award, tone: "purple" },
  quiz_passed: { icon: ClipboardCheck, tone: "green" },
  quiz_failed: { icon: RotateCcw, tone: "orange" },
  event_scheduled: { icon: CalendarClock, tone: "blue" },
  event_cancelled: { icon: CalendarX, tone: "red" },
  event_reminder: { icon: CalendarClock, tone: "blue" },
  deadline_reminder: { icon: CalendarClock, tone: "orange" },
  streak_reminder: { icon: Flame, tone: "orange" },
  streak_milestone: { icon: Flame, tone: "orange" },
  message_received: { icon: MessageSquare, tone: "blue" },
  message_from_learner: { icon: MessageSquare, tone: "blue" },
};

function hrefOf(n: LearnerNotification): string {
  switch (n.kind) {
    case "certificate_issued":
      return n.certificateId
        ? `/certificates/${n.certificateId}`
        : "/certificates";
    case "course_completed":
      return "/certificates";
    case "enrollment_started":
      return n.courseSlug ? courseHref(n.courseSlug) : "/courses?view=mine";
    case "quiz_passed":
    case "quiz_failed":
      return n.courseSlug && n.lessonId
        ? lessonHref(n.courseSlug, n.lessonId)
        : "/assessment";
    case "streak_reminder":
      return "/courses?view=mine";
    case "message_received":
      return n.threadId ? `/messages?thread=${n.threadId}` : "/messages";
    case "message_from_learner":
      return n.threadId
        ? `/messages?box=staff&thread=${n.threadId}`
        : "/messages?box=staff";
    default:
      return "/calendar";
  }
}

export function NotificationBell({
  initialUnread,
  timeZone,
}: {
  initialUnread: number;
  timeZone: string;
}) {
  const t = useTranslations("notifications");
  const calendar = useTranslations("calendar");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<LearnerNotification[] | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  function load() {
    startTransition(async () => {
      const result = await loadNotificationsAction();
      if ("error" in result) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setItems(result.items);
      setUnread(result.unread);
      setLoadedAt(Date.now());
    });
  }

  function toggle() {
    if (!open) load();
    setOpen(!open);
  }

  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      const count = await unreadNotificationsAction();
      if (count !== null) setUnread(count);
    }
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markAll() {
    startTransition(async () => {
      if (await markNotificationsReadAction(null)) {
        setUnread(0);
        setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list);
      }
    });
  }

  function openItem(n: LearnerNotification) {
    setOpen(false);
    if (n.read) return;
    setUnread((count) => Math.max(0, count - 1));
    setItems(
      (list) =>
        list?.map((item) =>
          item.id === n.id ? { ...item, read: true } : item,
        ) ?? list,
    );
    void markNotificationsReadAction([n.id]);
  }

  function messageOf(n: LearnerNotification) {
    const when = n.eventStartsAt
      ? format.dateTime(new Date(n.eventStartsAt), {
          timeZone,
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          numberingSystem: "latn",
        })
      : "";
    const percent =
      n.score !== null && n.possible
        ? Math.round((n.score / n.possible) * 100)
        : 0;
    return t(`kinds.${n.kind}`, {
      course: n.courseTitle ?? t("yourCourse"),
      lesson: n.lessonTitle ?? t("aQuiz"),
      event:
        n.eventTitle ??
        (n.eventKind ? calendar(`kinds.${n.eventKind}`) : t("anEvent")),
      time: when,
      percent: format.number(percent, { numberingSystem: "latn" }),
      days: n.days ?? 0,
      topic: n.courseSlug ? "course" : "support",
    });
  }

  return (
    <div className="header-action notification-root" ref={rootRef}>
      <button
        ref={buttonRef}
        className="icon-button notification-button"
        aria-label={unread ? t("buttonUnread", { count: unread }) : t("title")}
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={toggle}
      >
        <Bell />
        {unread > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unread > 9
              ? "9+"
              : format.number(unread, { numberingSystem: "latn" })}
          </span>
        )}
      </button>
      {open && (
        <div
          className="popover notification-popover"
          id="notification-panel"
          role="region"
          aria-label={t("title")}
        >
          <div className="notification-head">
            <strong>{t("title")}</strong>
            {unread > 0 && (
              <button
                type="button"
                className="text-link"
                onClick={markAll}
                disabled={pending}
              >
                <CheckCheck size={15} aria-hidden="true" /> {t("markAll")}
              </button>
            )}
          </div>
          {failed && (
            <p className="notification-state" role="alert">
              {t("loadFailed")}{" "}
              <button type="button" className="text-link" onClick={load}>
                {t("retry")}
              </button>
            </p>
          )}
          {!failed && items === null && (
            <p className="notification-state">{t("loading")}</p>
          )}
          {!failed && items?.length === 0 && (
            <p className="notification-state">{t("empty")}</p>
          )}
          {!failed && !!items?.length && (
            <ul className="notification-list" aria-busy={pending}>
              {items.map((n) => {
                const { icon: Icon, tone } = ICONS[n.kind];
                return (
                  <li key={n.id}>
                    <Link
                      href={hrefOf(n)}
                      className={`notification-item ${n.read ? "" : "unread"}`}
                      onClick={() => openItem(n)}
                    >
                      <span
                        className={`notification-icon ${tone}`}
                        aria-hidden="true"
                      >
                        <Icon size={18} />
                      </span>
                      <span className="notification-text">
                        <span dir="auto">{messageOf(n)}</span>
                        <small>
                          {format.relativeTime(
                            new Date(n.createdAt),
                            loadedAt || new Date(n.createdAt),
                          )}
                        </small>
                      </span>
                      {!n.read && (
                        <span
                          className="notification-unread-dot"
                          aria-label={t("unread")}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            className="notification-footer"
            href="/settings?tab=notifications"
            onClick={() => setOpen(false)}
          >
            {t("preferences")}
          </Link>
        </div>
      )}
    </div>
  );
}
