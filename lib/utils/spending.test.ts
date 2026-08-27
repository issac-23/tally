import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  monthlyAverageSpend,
  monthlyBurnRate,
  spendingSummary,
} from "./spending";

describe("monthlyBurnRate", () => {
  const iso = (daysAgo: number) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  it("is zero with nothing logged", () => {
    expect(monthlyBurnRate([], [])).toBe(0);
  });

  it("counts one-off spending inside the 30-day window", () => {
    expect(
      monthlyBurnRate(
        [
          { amount: 100, date: iso(1), recurrence: "once" },
          { amount: 50, date: iso(29), recurrence: "once" },
        ],
        []
      )
    ).toBe(150);
  });

  it("ignores one-off spending outside the window", () => {
    expect(
      monthlyBurnRate([{ amount: 100, date: iso(45), recurrence: "once" }], [])
    ).toBe(0);
  });

  it("adds a standing commitment at its monthly equivalent", () => {
    expect(
      monthlyBurnRate(
        [],
        [
          {
            amount: 1850,
            date: iso(5),
            merchant: "Greystar",
            recurrence: "monthly",
            category_id: "housing",
          },
        ]
      )
    ).toBe(1850);
  });

  it("counts a commitment even when it was last logged long ago", () => {
    // A yearly bill from eight months back is still owed, so it keeps
    // contributing its $100/mo instead of dropping out of the window.
    expect(
      monthlyBurnRate(
        [],
        [
          {
            amount: 1200,
            date: iso(240),
            merchant: "Geico",
            recurrence: "yearly",
            category_id: "insurance",
          },
        ]
      )
    ).toBeCloseTo(100, 6);
  });

  it("does not double count a recurring expense that also sits in the window", () => {
    const rent = {
      amount: 1850,
      date: iso(3),
      merchant: "Greystar",
      recurrence: "monthly",
      category_id: "housing",
    };
    // The same row comes back from both queries; it must contribute 1850.
    expect(monthlyBurnRate([rent], [rent])).toBe(1850);
  });

  it("combines one-off and recurring spending", () => {
    const rent = {
      amount: 1850,
      date: iso(2),
      merchant: "Greystar",
      recurrence: "monthly",
      category_id: "housing",
    };
    expect(
      monthlyBurnRate([{ amount: 200, date: iso(2), recurrence: "once" }, rent], [rent])
    ).toBe(2050);
  });

  it("treats a missing recurrence as one-off, so pre-migration rows keep their meaning", () => {
    expect(monthlyBurnRate([{ amount: 75, date: iso(1) }], [])).toBe(75);
  });
});

// Build a transaction dated N days before the (mocked) "now".
function tx(daysAgoFromNow: number, amount: number | string) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgoFromNow);
  return { amount, date: d.toISOString().slice(0, 10) };
}

describe("monthlyAverageSpend", () => {
  beforeEach(() => {
    // Pin "now" to a noon-UTC date for deterministic date math.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for an empty transaction list", () => {
    expect(monthlyAverageSpend([])).toBe(0);
  });

  it("sums all transactions within the last 30 days", () => {
    const txs = [tx(0, 50), tx(10, 100), tx(28, 25)];
    expect(monthlyAverageSpend(txs)).toBe(175);
  });

  it("excludes transactions older than 30 days", () => {
    const txs = [tx(10, 100), tx(45, 999)];
    expect(monthlyAverageSpend(txs)).toBe(100);
  });

  it("returns 0 when every transaction is outside the window", () => {
    const txs = [tx(60, 50), tx(90, 999)];
    expect(monthlyAverageSpend(txs)).toBe(0);
  });

  it("coerces string amounts to numbers", () => {
    const txs = [{ amount: "25.50", date: tx(5, 0).date }];
    expect(monthlyAverageSpend(txs)).toBe(25.5);
  });

  it("includes today's transactions in the window", () => {
    expect(monthlyAverageSpend([tx(0, 42)])).toBe(42);
  });
});

describe("spendingSummary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns all zeros for an empty list", () => {
    expect(spendingSummary([])).toEqual({
      today: 0,
      this_week: 0,
      this_month: 0,
    });
  });

  it("counts a today transaction in today, week, and month", () => {
    expect(spendingSummary([tx(0, 50)])).toEqual({
      today: 50,
      this_week: 50,
      this_month: 50,
    });
  });

  it("counts a 3-day-old transaction in week and month, not today", () => {
    expect(spendingSummary([tx(3, 100)])).toEqual({
      today: 0,
      this_week: 100,
      this_month: 100,
    });
  });

  it("counts a 15-day-old transaction in month only", () => {
    expect(spendingSummary([tx(15, 200)])).toEqual({
      today: 0,
      this_week: 0,
      this_month: 200,
    });
  });

  it("excludes a 35-day-old transaction from every window", () => {
    expect(spendingSummary([tx(35, 999)])).toEqual({
      today: 0,
      this_week: 0,
      this_month: 0,
    });
  });

  it("aggregates a realistic mix correctly", () => {
    // today: 10 + 20 = 30
    // week (last 7 days, today included): 30 + 50 = 80
    // month (last 30 days, week included): 80 + 100 = 180
    // 60-day-old should be ignored entirely
    const s = spendingSummary([
      tx(0, 10),
      tx(0, 20),
      tx(3, 50),
      tx(20, 100),
      tx(60, 999),
    ]);
    expect(s).toEqual({ today: 30, this_week: 80, this_month: 180 });
  });

  it("includes today within the week and month windows by design", () => {
    // Verifies windows are nested, not exclusive — a today transaction
    // legitimately shows up in all three running totals.
    const s = spendingSummary([tx(0, 100)]);
    expect(s.today).toBe(100);
    expect(s.this_week).toBe(100);
    expect(s.this_month).toBe(100);
  });
});
