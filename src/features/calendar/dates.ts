// Time-zone helpers shared by the server and the browser. Calendar days are civil dates
// (YYYY-MM-DD) in the learner's saved time zone; instants travel as ISO strings.

export type CivilDate = { year: number; month: number; day: number };

/** A zone the runtime does not recognise falls back to UTC, matching the database helper. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour") % 24,
    minute: value("minute"),
    second: value("second"),
  };
}

function offsetMs(ms: number, timeZone: string) {
  const p = zonedParts(ms, timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(ms / 1000) * 1000
  );
}

/** The instant at which the wall clock in `timeZone` shows the given local date and time. */
export function zonedTimeToUtc(
  date: CivilDate,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  let result = guess - offsetMs(guess, timeZone);
  // Re-check once so a daylight-saving change between the guess and the answer is honoured.
  const corrected = guess - offsetMs(result, timeZone);
  if (corrected !== result) result = corrected;
  return new Date(result);
}

export function civilDateOf(
  instant: Date | string,
  timeZone: string,
): CivilDate {
  const p = zonedParts(new Date(instant).getTime(), timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

export function dayKey(date: CivilDate): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function parseDayKey(key: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const check = new Date(Date.UTC(date.year, date.month - 1, date.day));
  return check.getUTCMonth() === date.month - 1 &&
    check.getUTCDate() === date.day
    ? date
    : null;
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/** 0 = Sunday. */
export function weekday(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

/** A civil date as a UTC-midnight Date, for formatting with `timeZone: "UTC"`. */
export function civilAsUtcDate(date: CivilDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

export function dayKeyOf(instant: Date | string, timeZone: string): string {
  return dayKey(civilDateOf(instant, timeZone));
}
