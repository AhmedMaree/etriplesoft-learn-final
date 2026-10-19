"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Flame,
  ListChecks,
  NotebookPen,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  useFormatter,
  useLocale,
  useTranslations,
  type DateTimeFormatOptions,
} from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, IconBox, Panel, Title } from "@/components/ui/primitives";
import { useDemoToast } from "@/lib/browser/demo-toast";
import {
  courseHref,
  lessonHref,
} from "@/features/courses/components/course-links";
import {
  addDays,
  civilAsUtcDate,
  dayKey,
  dayKeyOf,
  parseDayKey,
  type CivilDate,
} from "../dates";
import { rangeFor, shiftAnchor, visibleDays, type CalendarView } from "../grid";
import {
  isDueKind,
  type CalendarEvent,
  type CalendarEventKind,
  type LearningStreak,
} from "../types";
import {
  createStudySessionAction,
  deleteStudySessionAction,
  loadCalendarEventsAction,
} from "../server/actions";
import "../calendar.css";

const KIND_STYLE: Record<
  CalendarEventKind,
  { icon: LucideIcon; tone: string; dot: string }
> = {
  live_session: { icon: Video, tone: "blue", dot: "#06f" },
  deadline: { icon: FileText, tone: "green", dot: "#009868" },
  quiz: { icon: ClipboardCheck, tone: "green", dot: "#00674f" },
  office_hours: { icon: Users, tone: "purple", dot: "#7644e9" },
  workshop: { icon: Briefcase, tone: "teal", dot: "#065747" },
  study: { icon: NotebookPen, tone: "gray", dot: "#9ba5c4" },
};
const LEGEND: CalendarEventKind[] = [
  "live_session",
  "deadline",
  "quiz",
  "office_hours",
  "workshop",
  "study",
];
const DAY_MS = 86_400_000;
const MAX_PER_DAY = 2;

type Loaded = { from: string; to: string; events: CalendarEvent[] };

const endOf = (event: CalendarEvent) =>
  new Date(event.endsAt ?? event.startsAt).getTime();

export function CalendarPage({
  timeZone,
  todayKey,
  nowIso,
  initial,
  initialUpcoming,
  streak,
}: {
  timeZone: string;
  todayKey: string;
  nowIso: string;
  initial: Loaded;
  initialUpcoming: CalendarEvent[];
  streak: LearningStreak | null;
}) {
  const t = useTranslations("calendar");
  const format = useFormatter();
  const locale = useLocale();
  const notify = useDemoToast();
  const today = parseDayKey(todayKey) ?? { year: 1970, month: 1, day: 1 };
  const now = useMemo(() => new Date(nowIso).getTime(), [nowIso]);

  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState<CivilDate>(today);
  const [loaded, setLoaded] = useState<Loaded>(initial);
  const [upcoming, setUpcoming] = useState(initialUpcoming);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [planning, setPlanning] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const days = visibleDays(view, anchor);
  const range = rangeFor(view, anchor, timeZone);
  const covered = loaded.from <= range.from && loaded.to >= range.to;

  const dt = (date: Date, options: DateTimeFormatOptions) =>
    format.dateTime(date, { numberingSystem: "latn", ...options });
  const civil = (date: CivilDate, options: DateTimeFormatOptions) =>
    dt(civilAsUtcDate(date), { timeZone: "UTC", ...options });
  const time = (iso: string) =>
    dt(new Date(iso), { timeZone, hour: "numeric", minute: "2-digit" });
  const titleOf = (event: CalendarEvent) =>
    event.title ?? t(`kinds.${event.kind}`);
  const whenOf = (event: CalendarEvent) =>
    isDueKind(event.kind)
      ? t("dueAt", { time: time(event.startsAt) })
      : event.endsAt
        ? `${time(event.startsAt)} – ${time(event.endsAt)}`
        : time(event.startsAt);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of loaded.events) {
      const key = dayKeyOf(event.startsAt, timeZone);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [loaded.events, timeZone]);

  function load(next: { from: string; to: string }, refreshUpcoming = false) {
    startTransition(async () => {
      const [events, soon] = await Promise.all([
        loadCalendarEventsAction(next.from, next.to),
        refreshUpcoming
          ? loadCalendarEventsAction(
              new Date().toISOString(),
              new Date(Date.now() + 8 * DAY_MS).toISOString(),
            )
          : null,
      ]);
      if ("error" in events) {
        setFailed(true);
        return;
      }
      setFailed(false);
      setLoaded({ ...next, events: events.events });
      if (soon && "events" in soon) setUpcoming(soon.events);
    });
  }

  function go(nextView: CalendarView, nextAnchor: CivilDate) {
    setView(nextView);
    setAnchor(nextAnchor);
    const next = rangeFor(nextView, nextAnchor, timeZone);
    if (!(loaded.from <= next.from && loaded.to >= next.to)) load(next);
  }

  function open(event: CalendarEvent, opener: HTMLElement | null) {
    openerRef.current = opener;
    setSelected(event);
  }
  function close() {
    setSelected(null);
    setPlanning(false);
    openerRef.current?.focus();
  }
  function startPlanning(opener: HTMLElement | null) {
    openerRef.current = opener;
    setPlanning(true);
  }

  const todaysEvents = upcoming.filter(
    (e) =>
      e.status === "scheduled" &&
      dayKeyOf(e.startsAt, timeZone) === todayKey &&
      endOf(e) >= now,
  );
  const dueSoon = upcoming.filter(
    (e) =>
      e.status === "scheduled" &&
      isDueKind(e.kind) &&
      new Date(e.startsAt).getTime() >= now &&
      new Date(e.startsAt).getTime() < now + 7 * DAY_MS,
  );
  const laterThisWeek = upcoming.filter(
    (e) =>
      e.status === "scheduled" &&
      dayKeyOf(e.startsAt, timeZone) > todayKey &&
      new Date(e.startsAt).getTime() < now + 7 * DAY_MS,
  );
  const visibleEvents = days.flatMap((d) => byDay.get(dayKey(d)) ?? []);

  const label =
    view === "week"
      ? `${civil(days[0], { month: "short", day: "numeric" })} – ${civil(days[6], { month: "short", day: "numeric", year: "numeric" })}`
      : civil(anchor, { month: "long", year: "numeric" });
  const stepLabels =
    view === "week"
      ? [t("previousWeek"), t("nextWeek")]
      : [t("previousMonth"), t("nextMonth")];

  const stats = [
    {
      icon: CalendarDays,
      tone: "blue",
      label: t("upcomingToday"),
      value: t("eventsCount", { count: todaysEvents.length }),
      action: (
        <button className="text-link" onClick={() => go("week", today)}>
          {t("viewToday")}{" "}
          <ArrowRight size={17} className="flip-rtl" aria-hidden="true" />
        </button>
      ),
    },
    {
      icon: ListChecks,
      tone: "green",
      label: t("assignmentsDue"),
      value: t("itemsCount", { count: dueSoon.length }),
      action: (
        <button
          className="text-link"
          onClick={(e) =>
            dueSoon[0] ? open(dueSoon[0], e.currentTarget) : go("agenda", today)
          }
        >
          {t("viewDeadlines")}{" "}
          <ArrowRight size={17} className="flip-rtl" aria-hidden="true" />
        </button>
      ),
    },
    {
      icon: Flame,
      tone: "green",
      label: t("streak"),
      value: t("daysCount", { count: streak?.current ?? 0 }),
      action: (
        <span className="badge">
          {streak?.activeToday
            ? t("keepGoing")
            : streak?.current
              ? t("learnToday")
              : t("startStreak")}
        </span>
      ),
    },
  ];

  return (
    <div className="columns">
      <div className="primary">
        <div className="calendar-stats">
          {stats.map((stat) => (
            <Panel key={stat.label}>
              <IconBox icon={stat.icon} color={stat.tone} />
              <div>
                <p>{stat.label}</p>
                <h2>{stat.value}</h2>
                {stat.action}
              </div>
            </Panel>
          ))}
        </div>
        <div className="calendar-toolbar">
          <h1>{t("title")}</h1>
          <div className="segmented" role="group" aria-label={t("viewLabel")}>
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                className={view === v ? "selected" : ""}
                aria-pressed={view === v}
                onClick={() => go(v, anchor)}
                key={v}
              >
                {t(v)}
              </button>
            ))}
          </div>
          <Button outline onClick={() => go(view, today)}>
            {t("today")}
          </Button>
          <button
            className="square"
            aria-label={stepLabels[0]}
            onClick={() => go(view, shiftAnchor(view, anchor, -1))}
          >
            <ChevronLeft size={19} className="flip-rtl" />
          </button>
          <b aria-live="polite">{label}</b>
          <button
            className="square"
            aria-label={stepLabels[1]}
            onClick={() => go(view, shiftAnchor(view, anchor, 1))}
          >
            <ChevronRight size={19} className="flip-rtl" />
          </button>
        </div>
        <p className="calendar-zone">
          {t("timeZoneNote", { zone: timeZone })}{" "}
          {timeZone === "UTC" && (
            <Link href="/settings">{t("timeZoneHint")}</Link>
          )}
        </p>
        {failed && (
          <p className="calendar-status error" role="alert">
            {t("loadFailed")}{" "}
            <button className="text-link" onClick={() => load(range)}>
              {t("retry")}
            </button>
          </p>
        )}
        {!failed && covered && !visibleEvents.length && (
          <div className="calendar-empty">
            <p>
              {t(view === "week" ? "noEventsWeek" : "noEventsMonth")}{" "}
              {t("emptyHint")}
            </p>
            <button
              className="text-link"
              onClick={(e) => startPlanning(e.currentTarget)}
            >
              {t("planStudy")}{" "}
              <ArrowRight size={16} className="flip-rtl" aria-hidden="true" />
            </button>
          </div>
        )}
        <div
          className={`calendar-body ${pending || !covered ? "loading" : ""}`}
          aria-busy={pending || !covered}
        >
          {view === "agenda" ? (
            <Panel className="agenda">
              {visibleEvents.map((e) => (
                <button
                  key={e.id}
                  className={e.status === "cancelled" ? "cancelled" : ""}
                  onClick={(event) => open(e, event.currentTarget)}
                >
                  <b>
                    {dt(new Date(e.startsAt), {
                      timeZone,
                      month: "short",
                      day: "numeric",
                    })}
                  </b>
                  <IconBox
                    icon={KIND_STYLE[e.kind].icon}
                    color={KIND_STYLE[e.kind].tone}
                  />
                  <span>
                    <strong dir="auto">{titleOf(e)}</strong>
                    <small>
                      {e.status === "cancelled" ? `${t("cancelled")} · ` : ""}
                      {whenOf(e)}
                      {e.courseTitle ? (
                        <>
                          {" "}
                          · <bdi>{e.courseTitle}</bdi>
                        </>
                      ) : null}
                    </small>
                  </span>
                  <ChevronRight className="flip-rtl" aria-hidden="true" />
                </button>
              ))}
              {covered && !visibleEvents.length && <p>{t("noEventsMonth")}</p>}
            </Panel>
          ) : (
            <div className={"calendar-grid " + (view === "week" ? "week" : "")}>
              <div className="weekdays">
                {days.slice(0, 7).map((d) => (
                  <span key={dayKey(d)}>{civil(d, { weekday: "short" })}</span>
                ))}
              </div>
              <div className="calendar-days">
                {days.map((d) => {
                  const key = dayKey(d);
                  const list = byDay.get(key) ?? [];
                  const shown =
                    view === "week" ? list : list.slice(0, MAX_PER_DAY);
                  const outside = view === "month" && d.month !== anchor.month;
                  return (
                    <div
                      className={`${outside ? "outside" : ""} ${key === todayKey ? "is-today" : ""}`}
                      key={key}
                    >
                      <span
                        aria-label={civil(d, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      >
                        {format.number(d.day, { numberingSystem: "latn" })}
                      </span>
                      {shown.map((ev) => (
                        <button
                          key={ev.id}
                          className={`calendar-event ${KIND_STYLE[ev.kind].tone} ${ev.status === "cancelled" ? "cancelled" : ""}`}
                          onClick={(event) => open(ev, event.currentTarget)}
                        >
                          {(() => {
                            const Icon = KIND_STYLE[ev.kind].icon;
                            return <Icon size={15} aria-hidden="true" />;
                          })()}
                          <strong dir="auto">{titleOf(ev)}</strong>
                          <small>
                            {ev.status === "cancelled"
                              ? t("cancelled")
                              : whenOf(ev)}
                          </small>
                        </button>
                      ))}
                      {list.length > shown.length && (
                        <button
                          className="calendar-more"
                          onClick={() => go("week", d)}
                        >
                          {t("more", { count: list.length - shown.length })}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <Panel className="event-types">
          <Title>{t("eventTypes")}</Title>
          <div>
            {LEGEND.map((kind) => (
              <span key={kind}>
                <i
                  style={{ background: KIND_STYLE[kind].dot }}
                  aria-hidden="true"
                />
                {t(`kinds.${kind}`)}
                <small>{t(`kindDescriptions.${kind}`)}</small>
              </span>
            ))}
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel>
          <Title
            link={t("planStudy")}
            onClick={() =>
              startPlanning(document.activeElement as HTMLElement | null)
            }
          >
            {t("upcomingToday")}
          </Title>
          <h3 className="date-label">
            {civil(today, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h3>
          {todaysEvents.slice(0, 4).map((e) => (
            <UpcomingItem
              key={e.id}
              event={e}
              title={titleOf(e)}
              when={whenOf(e)}
              onOpen={open}
            />
          ))}
          {!todaysEvents.length && (
            <p className="calendar-rail-empty">{t("nothingToday")}</p>
          )}
        </Panel>
        <Panel>
          <Title onClick={() => go("agenda", today)}>{t("thisWeek")}</Title>
          {laterThisWeek.slice(0, 5).map((e) => (
            <UpcomingItem
              key={e.id}
              flat
              event={e}
              title={titleOf(e)}
              when={`${dt(new Date(e.startsAt), { timeZone, weekday: "short", month: "short", day: "numeric" })} · ${whenOf(e)}`}
              onOpen={open}
            />
          ))}
          {!laterThisWeek.length && (
            <p className="calendar-rail-empty">{t("nothingThisWeek")}</p>
          )}
        </Panel>
        <Panel className="sync-panel">
          <IconBox icon={CalendarDays} />
          <div>
            <h3>{t("syncTitle")}</h3>
            <p>{t("syncCopy")}</p>
            <a
              className="btn outline"
              href={`/api/calendar/ics?locale=${locale}`}
              download="etriplesoft-learning.ics"
            >
              <Download size={17} aria-hidden="true" /> {t("syncAction")}
            </a>
          </div>
        </Panel>
      </aside>
      {selected && (
        <Dialog
          labelledBy="event-title"
          onClose={close}
          closeLabel={t("closeEvent")}
        >
          <IconBox
            icon={KIND_STYLE[selected.kind].icon}
            color={KIND_STYLE[selected.kind].tone}
          />
          <p className="event-kind">
            {t(`kinds.${selected.kind}`)}
            {selected.status === "cancelled" && (
              <span className="event-cancelled">{t("cancelled")}</span>
            )}
          </p>
          <h2 id="event-title" dir="auto">
            {titleOf(selected)}
          </h2>
          <p>
            {dt(new Date(selected.startsAt), {
              timeZone,
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {whenOf(selected)}
          </p>
          {selected.courseTitle && (
            <p className="event-course">
              <bdi>{selected.courseTitle}</bdi>
            </p>
          )}
          {selected.description && (
            <p className="event-description" dir="auto">
              {selected.description}
            </p>
          )}
          <div className="event-actions">
            {selected.meetingUrl && endOf(selected) + 60 * 60_000 >= now && (
              <a
                className="btn"
                href={selected.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("joinSession")} <ExternalLink size={17} aria-hidden="true" />
              </a>
            )}
            {selected.courseSlug && selected.lessonId && (
              <Link
                className="btn outline"
                href={lessonHref(selected.courseSlug, selected.lessonId)}
              >
                {t("openLesson")}{" "}
                <ArrowRight size={17} className="flip-rtl" aria-hidden="true" />
              </Link>
            )}
            {selected.courseSlug && !selected.lessonId && (
              <Link
                className="btn outline"
                href={courseHref(selected.courseSlug)}
              >
                {t("viewCourse")}{" "}
                <ArrowRight size={17} className="flip-rtl" aria-hidden="true" />
              </Link>
            )}
            {selected.source === "personal" && (
              <Button
                outline
                className="calendar-danger"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteStudySessionAction(selected.id);
                    notify(
                      t(result === "deleted" ? "deleted" : "deleteFailed"),
                    );
                    if (result === "deleted") {
                      close();
                      load(range, true);
                    }
                  })
                }
              >
                <Trash2 size={17} aria-hidden="true" /> {t("deleteSession")}
              </Button>
            )}
          </div>
        </Dialog>
      )}
      {planning && (
        <Dialog
          labelledBy="plan-title"
          onClose={close}
          closeLabel={t("cancel")}
        >
          <StudyPlanner
            today={todayKey}
            nowIso={nowIso}
            timeZone={timeZone}
            onDone={(message) => {
              notify(message);
              close();
              load(range, true);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

function UpcomingItem({
  event,
  title,
  when,
  flat = false,
  onOpen,
}: {
  event: CalendarEvent;
  title: string;
  when: string;
  flat?: boolean;
  onOpen: (event: CalendarEvent, opener: HTMLElement | null) => void;
}) {
  return (
    <button
      className={`upcoming ${flat ? "flat" : ""}`}
      onClick={(e) => onOpen(event, e.currentTarget)}
    >
      <IconBox
        icon={KIND_STYLE[event.kind].icon}
        color={KIND_STYLE[event.kind].tone}
      />
      <span>
        <strong dir="auto">{title}</strong>
        <small>{when}</small>
        {event.courseTitle && (
          <small>
            <bdi>{event.courseTitle}</bdi>
          </small>
        )}
      </span>
      <ChevronRight size={18} className="flip-rtl" aria-hidden="true" />
    </button>
  );
}

/** Modal with focus trap; Escape and backdrop clicks close it and focus returns to the opener. */
function Dialog({
  labelledBy,
  onClose,
  closeLabel,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    ref.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = Array.from(
        ref.current.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="modal panel calendar-modal"
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close icon-button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}

function StudyPlanner({
  today,
  nowIso,
  timeZone,
  onDone,
}: {
  today: string;
  nowIso: string;
  timeZone: string;
  onDone: (message: string) => void;
}) {
  const t = useTranslations("calendar");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The next full hour on the learner's clock.
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date(new Date(nowIso).getTime() + 60 * 60_000));
  const defaultTime = `${hour.padStart(2, "0")}:00`;
  const maxDate = dayKey(
    addDays(parseDayKey(today) ?? { year: 1970, month: 1, day: 1 }, 365),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createStudySessionAction({}, data);
      if (result.success) onDone(t("planned"));
      else setError(t(`planErrors.${result.error ?? "failed"}`));
    });
  }

  return (
    <form className="study-planner" onSubmit={submit}>
      <IconBox icon={NotebookPen} color="blue" />
      <h2 id="plan-title">{t("planTitle")}</h2>
      <p>{t("planCopy")}</p>
      <label>
        <span>{t("sessionTitle")}</span>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={t("defaultSessionTitle")}
          dir="auto"
        />
      </label>
      <div className="study-planner-row">
        <label>
          <span>{t("date")}</span>
          <input
            name="date"
            type="date"
            required
            min={today}
            max={maxDate}
            defaultValue={today}
            dir="ltr"
          />
        </label>
        <label>
          <span>{t("startTime")}</span>
          <input
            name="time"
            type="time"
            required
            defaultValue={defaultTime}
            dir="ltr"
          />
        </label>
        <label>
          <span>{t("duration")}</span>
          <select name="duration" defaultValue="60">
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {t("minutes", { count: m })}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="calendar-status error" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
