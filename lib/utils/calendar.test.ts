import { describe, it, expect } from "vitest";
import {
  addDays,
  dayKey,
  daysAgo,
  describeMonths,
  formatDayKey,
  latestDayOnEarth,
  monthKey,
  parseDayKey,
  today,
} from "./calendar";

describe("day keys", () => {
  it("reads the local calendar day, not the UTC one", () => {
    // Late evening local time can already be tomorrow in UTC.
    expect(dayKey(new Date(2026, 4, 15, 23, 30))).toBe("2026-05-15");
    expect(dayKey(new Date(2026, 4, 15, 0, 5))).toBe("2026-05-15");
    expect(today(new Date(2026, 0, 2, 12))).toBe("2026-01-02");
  });

  it("round-trips through parseDayKey at local midnight", () => {
    const d = parseDayKey("2026-05-15");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 4, 15, 0]);
  });

  it("formats a stored date as that day, in any zone", () => {
    // new Date("2026-05-15") would be May 14 evening west of UTC.
    expect(formatDayKey("2026-05-15")).toBe("May 15");
    expect(formatDayKey("2026-05-15", { month: "long", year: "numeric" })).toBe("May 2026");
  });
});

describe("windows", () => {
  it("counts back through month and year ends", () => {
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("starts a trailing window N days before today", () => {
    const now = new Date(2026, 4, 15, 18, 0);
    expect(daysAgo(now, 0)).toBe("2026-05-15");
    expect(daysAgo(now, 30)).toBe("2026-04-15");
    expect(daysAgo(now, 60)).toBe("2026-03-16");
  });

  it("is a whole number of calendar days whatever the clocks did", () => {
    // These windows span a clock change in zones that have one (US on 1
    // November, EU on 25 October). Subtracting 30 * 24 hours there lands an
    // hour off midnight and can name the wrong day; calendar arithmetic can't.
    expect(daysAgo(new Date(2026, 10, 10, 0, 30), 30)).toBe("2026-10-11");
    expect(daysAgo(new Date(2026, 2, 30, 0, 30), 30)).toBe("2026-02-28");
  });
});

describe("months", () => {
  it("keys a month as YYYY-MM", () => {
    expect(monthKey(new Date(2026, 0, 31))).toBe("2026-01");
  });

  it("describes a span of months the way people say it", () => {
    expect(describeMonths(0.5, 0)).toBe("15 days");
    expect(describeMonths(0, 0)).toBe("0 days");
    expect(describeMonths(0, 1)).toBe("1 day");
    expect(describeMonths(1, 1)).toBe("1 month");
    expect(describeMonths(5.27, 1)).toBe("5.3 months");
  });
});

describe("latestDayOnEarth", () => {
  it("is already tomorrow for the earliest zone late in the UTC day", () => {
    expect(latestDayOnEarth(new Date(Date.UTC(2026, 4, 15, 12, 0)))).toBe("2026-05-16");
    expect(latestDayOnEarth(new Date(Date.UTC(2026, 4, 15, 9, 59)))).toBe("2026-05-15");
  });
});
