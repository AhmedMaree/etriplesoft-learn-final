import { addDays, weekday, zonedTimeToUtc, type CivilDate } from "./dates";

export type CalendarView = "month" | "week" | "agenda";

const daysInMonth = (date: CivilDate) =>
  new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();

/** Visible days: a Sunday-first week, or every week touching the anchor's month. */
export function visibleDays(
  view: CalendarView,
  anchor: CivilDate,
): CivilDate[] {
  if (view === "week") {
    const start = addDays(anchor, -weekday(anchor));
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  const first = { ...anchor, day: 1 };
  const last = { ...anchor, day: daysInMonth(anchor) };
  if (view === "agenda")
    return Array.from({ length: last.day }, (_, i) => addDays(first, i));
  const start = addDays(first, -weekday(first));
  const end = addDays(last, 6 - weekday(last));
  const count =
    Math.round(
      (Date.UTC(end.year, end.month - 1, end.day) -
        Date.UTC(start.year, start.month - 1, start.day)) /
        86_400_000,
    ) + 1;
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** The instants bounding the visible days in the learner's time zone. */
export function rangeFor(
  view: CalendarView,
  anchor: CivilDate,
  timeZone: string,
) {
  const days = visibleDays(view, anchor);
  return {
    from: zonedTimeToUtc(days[0], 0, 0, timeZone).toISOString(),
    to: zonedTimeToUtc(
      addDays(days[days.length - 1], 1),
      0,
      0,
      timeZone,
    ).toISOString(),
  };
}

export function shiftAnchor(
  view: CalendarView,
  anchor: CivilDate,
  step: number,
): CivilDate {
  if (view === "week") return addDays(anchor, step * 7);
  const d = new Date(Date.UTC(anchor.year, anchor.month - 1 + step, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: 1 };
}
