import { describe, it, expect } from "vitest";
import {
  RECURRENCE_OPTIONS,
  isRecurrence,
  monthlyEquivalent,
  recurrenceBadge,
  recurrenceLabel,
  recurringMonthlyTotal,
  recurringSeries,
} from "./recurrence";

describe("isRecurrence", () => {
  it("accepts every option it offers", () => {
    for (const opt of RECURRENCE_OPTIONS) {
      expect(isRecurrence(opt.value)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    expect(isRecurrence("fortnightly")).toBe(false);
    expect(isRecurrence("")).toBe(false);
    expect(isRecurrence(null)).toBe(false);
    expect(isRecurrence(3)).toBe(false);
  });
});

describe("monthlyEquivalent", () => {
  it("is zero for a one-off, whatever the amount", () => {
    expect(monthlyEquivalent(2000, "once")).toBe(0);
  });

  it("passes a monthly amount straight through", () => {
    expect(monthlyEquivalent(1850, "monthly")).toBe(1850);
  });

  it("spreads a yearly bill over twelve months", () => {
    expect(monthlyEquivalent(1200, "yearly")).toBeCloseTo(100, 6);
  });

  it("spreads a six-monthly bill over six", () => {
    expect(monthlyEquivalent(600, "semiannual")).toBeCloseTo(100, 6);
  });

  it("treats quarterly as a third of the amount", () => {
    expect(monthlyEquivalent(300, "quarterly")).toBeCloseTo(100, 6);
  });

  it("uses average weeks per month, not a flat four", () => {
    // 365.25 days / 12 months / 7 = 4.348 weeks, so $100/week is $435, not
    // $400. Using four would understate a weekly cost by ~8%.
    expect(monthlyEquivalent(100, "weekly")).toBeCloseTo(434.82, 2);
    expect(monthlyEquivalent(100, "biweekly")).toBeCloseTo(217.41, 2);
  });

  it("uses average days per month for daily", () => {
    expect(monthlyEquivalent(10, "daily")).toBeCloseTo(304.375, 2);
  });

  it("coerces string amounts, as Postgres numerics arrive", () => {
    expect(monthlyEquivalent("1850.00", "monthly")).toBe(1850);
  });

  it("falls back to one-off for an unknown or missing value", () => {
    expect(monthlyEquivalent(500, "whenever")).toBe(0);
    expect(monthlyEquivalent(500, null)).toBe(0);
    expect(monthlyEquivalent(500, undefined)).toBe(0);
  });

  it("returns zero rather than NaN for a junk amount", () => {
    expect(monthlyEquivalent("abc", "monthly")).toBe(0);
  });
});

describe("recurrenceLabel / recurrenceBadge", () => {
  it("labels a known value", () => {
    expect(recurrenceLabel("biweekly")).toBe("Every 2 weeks");
  });

  it("gives one-off an empty badge so no chip renders", () => {
    expect(recurrenceBadge("once")).toBe("");
    expect(recurrenceBadge(null)).toBe("");
  });

  it("badges a recurring value", () => {
    expect(recurrenceBadge("monthly")).toBe("Monthly");
  });
});

describe("recurringSeries", () => {
  const rent = (date: string, amount: number) => ({
    date,
    amount,
    merchant: "Greystar",
    recurrence: "monthly",
    category_id: "housing",
  });

  it("ignores one-off transactions entirely", () => {
    expect(
      recurringSeries([
        { date: "2026-08-01", amount: 50, recurrence: "once" },
        { date: "2026-08-02", amount: 50, recurrence: null },
      ])
    ).toEqual([]);
  });

  it("collapses repeated logs of the same commitment into one", () => {
    const series = recurringSeries([
      rent("2026-08-01", 1850),
      rent("2026-07-01", 1850),
      rent("2026-06-01", 1850),
    ]);
    expect(series).toHaveLength(1);
  });

  it("keeps the newest amount, so a rent rise updates rather than duplicates", () => {
    const series = recurringSeries([
      rent("2026-06-01", 1850),
      rent("2026-08-01", 1900), // newest
      rent("2026-07-01", 1850),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].amount).toBe(1900);
  });

  it("treats different merchants as different commitments", () => {
    const series = recurringSeries([
      { date: "2026-08-01", amount: 15, merchant: "Netflix", recurrence: "monthly", category_id: "fun" },
      { date: "2026-08-01", amount: 12, merchant: "Spotify", recurrence: "monthly", category_id: "fun" },
    ]);
    expect(series).toHaveLength(2);
  });

  it("treats different frequencies as different commitments", () => {
    const series = recurringSeries([
      { date: "2026-08-01", amount: 15, merchant: "Acme", recurrence: "monthly", category_id: "c" },
      { date: "2026-08-01", amount: 150, merchant: "Acme", recurrence: "yearly", category_id: "c" },
    ]);
    expect(series).toHaveLength(2);
  });

  it("matches merchants case- and whitespace-insensitively", () => {
    const series = recurringSeries([
      { date: "2026-08-01", amount: 15, merchant: " netflix ", recurrence: "monthly", category_id: "fun" },
      { date: "2026-07-01", amount: 15, merchant: "Netflix", recurrence: "monthly", category_id: "fun" },
    ]);
    expect(series).toHaveLength(1);
  });

  it("reads the category off a joined object as well as a flat id", () => {
    const series = recurringSeries([
      { date: "2026-08-01", amount: 15, merchant: "Acme", recurrence: "monthly", category: { id: "a" } },
      { date: "2026-08-01", amount: 15, merchant: "Acme", recurrence: "monthly", category: { id: "b" } },
    ]);
    expect(series).toHaveLength(2);
  });
});

describe("recurringMonthlyTotal", () => {
  it("is zero with no transactions", () => {
    expect(recurringMonthlyTotal([])).toBe(0);
  });

  it("sums monthly equivalents across commitments", () => {
    const total = recurringMonthlyTotal([
      { date: "2026-08-01", amount: 1850, merchant: "Greystar", recurrence: "monthly", category_id: "housing" },
      { date: "2026-08-01", amount: 1200, merchant: "Geico", recurrence: "yearly", category_id: "insurance" },
      { date: "2026-08-01", amount: 15, merchant: "Netflix", recurrence: "monthly", category_id: "fun" },
    ]);
    expect(total).toBeCloseTo(1850 + 100 + 15, 6);
  });

  it("does not multiply a commitment that was logged every month", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      date: `2026-${String(i + 1).padStart(2, "0")}-01`,
      amount: 1850,
      merchant: "Greystar",
      recurrence: "monthly",
      category_id: "housing",
    }));
    expect(recurringMonthlyTotal(rows)).toBe(1850);
  });
});
