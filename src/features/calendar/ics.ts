// RFC 5545 calendar file. Times are written in UTC so any calendar app shows them in its own zone.
import type { CalendarEvent } from "./types";

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a single space. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (size + bytes > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

export function buildIcsCalendar(
  events: CalendarEvent[],
  options: {
    now: Date;
    host: string;
    titleFor: (event: CalendarEvent) => string;
    courseUrl: (event: CalendarEvent) => string | null;
  },
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ETripleSoft//Learn//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  for (const event of events) {
    // A due moment becomes a 30-minute block so it is visible in every calendar app.
    const end =
      event.endsAt ??
      new Date(new Date(event.startsAt).getTime() + 30 * 60_000).toISOString();
    const details = [event.courseTitle, event.description, event.meetingUrl]
      .filter(Boolean)
      .join("\n\n");
    const url = event.meetingUrl ?? options.courseUrl(event);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.source}-${event.id}@${options.host}`,
      `DTSTAMP:${stamp(options.now.toISOString())}`,
      `DTSTART:${stamp(event.startsAt)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${escapeIcsText(options.titleFor(event))}`,
      ...(details ? [`DESCRIPTION:${escapeIcsText(details)}`] : []),
      ...(url ? [`URL:${url}`] : []),
      `STATUS:${event.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
