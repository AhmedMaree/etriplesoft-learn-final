"use client";

import { useState } from 'react';
import { CalendarDays, ChevronRight, ChevronLeft, ArrowRight, ListChecks, Flame, X } from 'lucide-react';
import { events } from '@/features/calendar/data/demo-events';
import { Button, Panel, Title, IconBox } from '@/components/ui/primitives';
import { useDemoToast } from '@/lib/browser/demo-toast';
import { useDemoNavigation } from '@/hooks/use-demo-navigation';
import { download } from '@/lib/browser/download';
import { useTranslations, useFormatter } from 'next-intl';


export function CalendarPage() {
  const messages = useTranslations("calendar");
  const format = useFormatter();
  const navigate = useDemoNavigation();
  const notify = useDemoToast();

  const [view, setView] = useState("Month");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<(typeof events)[number] | null>(
    null,
  );
  const date = new Date(2024, 3 + offset, 1);
  const days = new Date(2024, 4 + offset, 0).getDate();
  const start = date.getDay();
  function sync() {
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ETripleSoft//Learn//EN",
      ...events.flatMap((e) => [
        "BEGIN:VEVENT",
        `UID:learn-${e.day}@etriplesoft`,
        `DTSTAMP:20240401T000000Z`,
        `DTSTART;VALUE=DATE:202404${String(e.day).padStart(2, "0")}`,
        `SUMMARY:${e.title}`,
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ];
    download("etriplesoft-learning.ics", lines.join("\r\n"), "text/calendar");
    notify(messages("downloaded"));
  }
  return (
    <div className="columns">
      <div className="primary">
        <div className="calendar-stats">
          {[CalendarDays, ListChecks, Flame].map((I, i) => (
            <Panel key={i}>
              <IconBox icon={I} color={i ? "green" : "blue"} />
              <div>
                <p>
                  {[messages("upcomingToday"), messages("assignmentsDue"), messages("streak")][i]}
                </p>
                <h2>{format.number([3, 2, 7][i], { numberingSystem: "latn" })} {[messages("eventsUnit"), messages("itemsUnit"), messages("daysUnit")][i]}</h2>
                {i < 2 ? (
                  <button
                    className="text-link"
                    onClick={() =>
                      i === 0 ? setView("Agenda") : setSelected(events[4])
                    }
                  >
                    {i === 0 ? "View Today" : "View Deadlines"}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <span className="badge">{messages("keepGoing")}</span>
                )}
              </div>
            </Panel>
          ))}
        </div>
        <div className="calendar-toolbar">
          <h1>{messages("title")}</h1>
          <div className="segmented">
            {["Month", "Week", "Agenda"].map((t) => (
              <button
                className={view === t ? "selected" : ""}
                onClick={() => setView(t)}
                key={t}
              >
                {t === "Month" ? messages("month") : t === "Week" ? messages("week") : messages("agenda")}
              </button>
            ))}
          </div>
          <Button outline onClick={() => setOffset(0)}>
            {messages("today")}
          </Button>
          <button
            className="square"
            aria-label={messages("previousMonth")}
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={19} />
          </button>
          <b>
            {format.dateTime(date, { month: "long", year: "numeric", numberingSystem: "latn" })}
          </b>
          <button
            className="square"
            aria-label={messages("nextMonth")}
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
        {view === "Agenda" ? (
          <Panel className="agenda">
            {offset === 0 ? (
              events.map((e) => (
                <button key={e.day} onClick={() => setSelected(e)}>
                  <b>{format.dateTime(new Date(2024, 3, e.day), { month: "short", numberingSystem: "latn" }).toUpperCase()} {format.number(e.day, { numberingSystem: "latn" })}</b>
                  <IconBox icon={e.icon} color={e.type} />
                  <span>
                    <strong>{e.title}</strong>
                    <small>{e.sub}</small>
                  </span>
                  <ChevronRight />
                </button>
              ))
            ) : (
              <p>No events scheduled this month.</p>
            )}
          </Panel>
        ) : (
          <div className={"calendar-grid " + (view === "Week" ? "week" : "")}>
            <div className="weekdays">
              {Array.from({ length: 7 }, (_, index) => format.dateTime(new Date(2024, 3, 7 + index), { weekday: "short", numberingSystem: "latn" })).map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="calendar-days">
              {Array.from(
                {
                  length:
                    view === "Week" ? 7 : Math.ceil((days + start) / 7) * 7,
                },
                (_, i) => {
                  const day = i - start + 1;
                  const valid = day > 0 && day <= days;
                  const ev =
                    offset === 0
                      ? events.find((e) => e.day === day)
                      : undefined;
                  return (
                    <div className={!valid ? "outside" : ""} key={i}>
                      <span>
                        {day <= 0
                          ? new Date(2024, 3 + offset, 0).getDate() + day
                          : day > days
                            ? day - days
                            : day}
                      </span>
                      {ev && (
                        <button
                          className={"calendar-event " + ev.type}
                          onClick={() => setSelected(ev)}
                        >
                          <ev.icon size={17} />
                          <strong>{ev.title}</strong>
                          <small>{ev.sub}</small>
                        </button>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}
        <Panel className="event-types">
          <Title>{messages("eventTypes")}</Title>
          <div>
            {[
              "Live Session",
              "Course Deadline",
              "Quiz",
              "Office Hours",
              "Business Training",
              "Study Reminder",
            ].map((t, i) => (
              <span key={t}>
                <i
                  style={{
                    background: [
                      "#06f",
                      "#009868",
                      "#00674f",
                      "#7644e9",
                      "#065747",
                      "#9ba5c4",
                    ][i],
                  }}
                />
                {t}
                <small>
                  {
                    [
                      "Online class or webinar",
                      "Assignments or projects",
                      "Assessments",
                      "Instructor Q&A",
                      "Career & industry sessions",
                      "Personal study time",
                    ][i]
                  }
                </small>
              </span>
            ))}
          </div>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel>
          <Title onClick={() => setView("Agenda")}>{messages("upcomingToday")}</Title>
          <h3 className="date-label">{format.dateTime(new Date(2024, 3, 1), { weekday: "long", month: "long", day: "numeric", year: "numeric", numberingSystem: "latn" })}</h3>
          {[
            events[0],
            {
              ...events[4],
              title: "Complete Module 2 Assignment",
              sub: "Due today",
            },
            { ...events[2], title: "Office Hours", sub: "2:00 PM – 3:00 PM" },
          ].map((e, i) => (
            <button
              className="upcoming"
              key={e.title}
              onClick={() => setSelected(e)}
            >
              <IconBox icon={e.icon} color={e.type} />
              <span>
                <strong>{e.title}</strong>
                <small>{e.sub}</small>
                <small>
                  {
                    [
                      "Odoo Development",
                      "Odoo Fundamentals",
                      "Q&A with Expert Instructor",
                    ][i]
                  }
                </small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </Panel>
        <Panel>
          <Title onClick={() => setView("Agenda")}>{messages("thisWeek")}</Title>
          {[events[1], events[4], events[5], events[8]].map((e) => (
            <button
              className="upcoming flat"
              key={e.day}
              onClick={() => setSelected(e)}
            >
              <IconBox icon={e.icon} color={e.type} />
              <span>
                <strong>
                  {e.title}: {e.sub.split(" · ")[0]}
                </strong>
                <small>{format.dateTime(new Date(2024, 3, e.day), { month: "long", day: "numeric", year: "numeric", numberingSystem: "latn" })}</small>
                <small>Odoo Fundamentals</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </Panel>
        <Panel className="sync-panel">
          <IconBox icon={CalendarDays} />
          <div>
            <h3>{messages("syncTitle")}</h3>
            <p>
              {messages("syncCopy")}
            </p>
            <Button outline onClick={sync}>
              {messages("syncAction")} <ArrowRight size={19} />
            </Button>
          </div>
        </Panel>
      </aside>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-title"
            className="modal panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close event"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <IconBox icon={selected.icon} color={selected.type} />
            <h2 id="event-title">{selected.title}</h2>
            <p>
              April {selected.day}, 2024 · {selected.sub}
            </p>
            <Button
              onClick={() => {
                setSelected(null);
                navigate(
                  selected.title.includes("Quiz")
                    ? "assessment"
                    : "detail-course",
                );
              }}
            >
              View Course <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
