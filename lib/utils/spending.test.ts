import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { monthlyAverageSpend, spendingSummary } from "./spending";

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
