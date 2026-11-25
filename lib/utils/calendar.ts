/**
 * Days, windows and months, defined once.
 *
 * "Today" and "N days ago" used to be worked out four ways: a UTC string for
 * a query bound, local midnight in the spending maths, a UTC slice for a
 * form's default date, and `new Date("2026-05-15")`, which parses as UTC
 * midnight and shows the day before for anyone west of Greenwich. A month was
 * 30, 30.44 or 365.25 / 12 days depending on the file.
 *
 * Everything here is the user's local calendar. A date is a day key, the
 * string `YYYY-MM-DD`, which is what the database stores and what compares
 * correctly as text, so a window is a key to compare against rather than a
 * timestamp. Day arithmetic goes through the calendar (`new Date(y, m, d + n)`)
 * and not through milliseconds, so a daylight-saving change can't push a
 * cutoff a day either way.
 *
 * Turning an instant into a day is the one step that depends on where the
 * person is: 9pm in New York is already tomorrow in UTC, so a server in UTC
 * would call a US evening's expenses tomorrow's and show Today as nothing.
 * The functions that do that step — `dayKey`, `today`, `monthKey` and
 * `daysAgo` — take an optional IANA zone, and the dashboard passes the one
 * the browser reported (lib/utils/time-zone.ts). Without one they read the
 * machine's own zone, which is what the browser-side callers want.
 *
 * `parseDayKey` and `addDays` deliberately don't take a zone. They are
 * calendar arithmetic over a key, done entirely in one zone and coming back
 * out as a key; handing them a second zone would shift the answer twice.
 *
 * `latestDayOnEarth` is its own case: it is about every zone at once, not
 * about the viewer's.
 */

/**
 * Days in an average month, for turning months into days and back. One
 * constant, so a weekly step in the projection and a weekly cost in the
 * runway agree on how long a month is.
 */
export const DAYS_PER_MONTH = 365.25 / 12;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The year, month and day `date` falls on in `timeZone`.
 *
 * Read out of `formatToParts` rather than off a formatted string: en-CA
 * renders a date as `2026-03-09` on Node 24, but a locale's pattern is
 * ICU's to change and the parts are named whatever it does.
 *
 * An unrecognised zone makes `Intl.DateTimeFormat` throw a RangeError. The
 * zone arrives from a cookie the browser wrote, so it can be anything at
 * all, and a throw here would be a 500 on the dashboard. Anything Intl
 * won't take falls back to UTC, which is what a server with no zone to go
 * on was already doing.
 */
function zonedParts(date: Date, timeZone: string): [number, number, number] {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
  } catch {
    return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
  }
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return [value("year"), value("month"), value("day")];
}

/**
 * The calendar day of `date`, as YYYY-MM-DD, in `timeZone` — or in the
 * machine's own zone when none is given.
 */
export function dayKey(date: Date, timeZone?: string): string {
  if (timeZone !== undefined) {
    const [year, month, day] = zonedParts(date, timeZone);
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's day key. */
export function today(now: Date = new Date(), timeZone?: string): string {
  return dayKey(now, timeZone);
}

/** A day key as the local midnight that starts it. */
export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** The day `days` after `key`; negative goes back. */
export function addDays(key: string, days: number): string {
  const d = parseDayKey(key);
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/**
 * The first day of a trailing window: the window of the last 30 days starts
 * at `daysAgo(now, 30)`, and a date is inside it when its key is >= that.
 */
export function daysAgo(now: Date, days: number, timeZone?: string): string {
  return addDays(today(now, timeZone), -days);
}

/** A day key written out for a person, e.g. "May 15". */
export function formatDayKey(
  key: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  return parseDayKey(key).toLocaleDateString("en-US", options);
}

/** YYYY-MM for the month containing `date`, in `timeZone` if one is given. */
export function monthKey(date: Date, timeZone?: string): string {
  if (timeZone !== undefined) {
    const [year, month] = zonedParts(date, timeZone);
    return `${year}-${pad(month)}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/**
 * The latest day it could be anywhere on Earth right now.
 *
 * Kiritimati is UTC+14, so while a server in UTC still says Monday, someone
 * there is already in Tuesday. A form defaults to the browser's today, and a
 * server that judged "in the future" by its own zone would turn that default
 * away for everyone east of it. A date is only really in the future if no
 * time zone has reached it yet.
 */
export function latestDayOnEarth(now: Date = new Date()): string {
  const ahead = new Date(now.getTime() + 14 * 60 * 60 * 1000);
  return `${ahead.getUTCFullYear()}-${pad(ahead.getUTCMonth() + 1)}-${pad(ahead.getUTCDate())}`;
}

/**
 * A length of time given in months, as people say it: "18 days" under a
 * month, "3.4 months" over. `minDays` is the fewest days it will claim,
 * since "0 days" reads differently in a sentence about what's left than in
 * one about what changed.
 */
export function describeMonths(months: number, minDays: number): string {
  if (months < 1) {
    const days = Math.max(minDays, Math.round(months * DAYS_PER_MONTH));
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  const rounded = Math.round(months * 10) / 10;
  return `${rounded} month${rounded === 1 ? "" : "s"}`;
}
