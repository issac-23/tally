import { describe, it, expect } from "vitest";
import { groupByCategory, groupByMerchant, comparePeriods } from "./aggregation";

const food = { id: "food", name: "Food", icon: "utensils", color: "#D4762C" };
const rent = { id: "rent", name: "Rent", icon: "home", color: "#C49A0A" };

function tx(daysAgoFromNow: number, amount: number, category = food) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgoFromNow);
  return { amount, date: d.toISOString().slice(0, 10), category };
}

describe("groupByCategory", () => {
  it("returns an empty array for no transactions", () => {
    expect(groupByCategory([])).toEqual([]);
  });

  it("sums multiple transactions in the same category", () => {
    const result = groupByCategory([tx(1, 50), tx(2, 100)]);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(150);
    expect(result[0].share).toBe(1);
  });

  it("returns categories sorted descending by amount", () => {
    const result = groupByCategory([
      tx(1, 50, food),
      tx(1, 200, rent),
      tx(1, 100, food),
    ]);
    expect(result.map((s) => s.category.id)).toEqual(["rent", "food"]);
  });

  it("calculates share as a fraction of the total", () => {
    const result = groupByCategory([
      tx(1, 250, food),
      tx(1, 750, rent),
    ]);
    expect(result.find((s) => s.category.id === "rent")?.share).toBe(0.75);
    expect(result.find((s) => s.category.id === "food")?.share).toBe(0.25);
  });

  it("buckets null-category transactions as Uncategorized", () => {
    const txWithNull = { amount: 50, date: tx(1, 0).date, category: null };
    const result = groupByCategory([txWithNull, tx(1, 50)]);
    const uncat = result.find((s) => s.category.id === "__none");
    expect(uncat).toBeDefined();
    expect(uncat?.category.name).toBe("Uncategorized");
    expect(uncat?.amount).toBe(50);
  });

  it("returns empty when total is zero", () => {
    // One transaction with amount 0 — total is 0, no slices to show.
    expect(groupByCategory([tx(1, 0)])).toEqual([]);
  });
});

describe("groupByMerchant", () => {
  function txWithMerchant(amount: number, merchant: string | null) {
    return { amount, date: tx(0, 0).date, merchant, category: null };
  }

  it("returns an empty array for no transactions", () => {
    expect(groupByMerchant([])).toEqual([]);
  });

  it("sums multiple transactions for the same merchant", () => {
    const result = groupByMerchant([
      txWithMerchant(50, "Starbucks"),
      txWithMerchant(100, "Starbucks"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].category.name).toBe("Starbucks");
    expect(result[0].amount).toBe(150);
  });

  it("returns merchants sorted descending by amount", () => {
    const result = groupByMerchant([
      txWithMerchant(50, "Starbucks"),
      txWithMerchant(200, "Amazon"),
      txWithMerchant(100, "Target"),
    ]);
    expect(result.map((s) => s.category.name)).toEqual([
      "Amazon",
      "Target",
      "Starbucks",
    ]);
  });

  it("buckets null and empty merchants as Unspecified", () => {
    const result = groupByMerchant([
      txWithMerchant(50, null),
      txWithMerchant(75, ""),
      txWithMerchant(100, "Amazon"),
    ]);
    const unspecified = result.find((s) => s.category.name === "Unspecified");
    expect(unspecified?.amount).toBe(125);
  });

  it("preserves merchant casing (Starbucks and starbucks are different)", () => {
    const result = groupByMerchant([
      txWithMerchant(50, "Starbucks"),
      txWithMerchant(100, "starbucks"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("trims surrounding whitespace from merchant names", () => {
    const result = groupByMerchant([
      txWithMerchant(50, "  Amazon  "),
      txWithMerchant(100, "Amazon"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(150);
  });

  it("assigns a stable color to the same merchant across calls", () => {
    const txs = [
      txWithMerchant(50, "Amazon"),
      txWithMerchant(100, "Starbucks"),
    ];
    const a = groupByMerchant(txs);
    const b = groupByMerchant(txs);
    expect(a[0].category.color).toBe(b[0].category.color);
    expect(a[1].category.color).toBe(b[1].category.color);
  });
});

describe("comparePeriods", () => {
  // Pin "now" so tests are deterministic across days.
  const now = new Date("2026-05-15T12:00:00Z");

  it("returns zero totals for empty list", () => {
    expect(comparePeriods([], now)).toEqual({
      current: 0,
      prior: 0,
      deltaPercent: null,
    });
  });

  it("counts transactions in the last 30 days as current", () => {
    const txs = [
      { ...tx(0, 100), date: dateNDaysFrom(now, -1) },
      { ...tx(0, 50), date: dateNDaysFrom(now, -15) },
    ];
    const result = comparePeriods(txs, now);
    expect(result.current).toBe(150);
    expect(result.prior).toBe(0);
  });

  it("counts transactions 30 to 60 days back as prior", () => {
    const txs = [
      { ...tx(0, 200), date: dateNDaysFrom(now, -45) },
    ];
    const result = comparePeriods(txs, now);
    expect(result.current).toBe(0);
    expect(result.prior).toBe(200);
  });

  it("ignores transactions older than 60 days", () => {
    const txs = [
      { ...tx(0, 999), date: dateNDaysFrom(now, -90) },
    ];
    const result = comparePeriods(txs, now);
    expect(result).toEqual({ current: 0, prior: 0, deltaPercent: null });
  });

  it("computes a positive delta when spending is up", () => {
    const txs = [
      { ...tx(0, 200), date: dateNDaysFrom(now, -5) },   // current 200
      { ...tx(0, 100), date: dateNDaysFrom(now, -45) }, // prior 100
    ];
    const result = comparePeriods(txs, now);
    expect(result.current).toBe(200);
    expect(result.prior).toBe(100);
    expect(result.deltaPercent).toBe(100); // doubled
  });

  it("computes a negative delta when spending is down", () => {
    const txs = [
      { ...tx(0, 50), date: dateNDaysFrom(now, -5) },
      { ...tx(0, 100), date: dateNDaysFrom(now, -45) },
    ];
    const result = comparePeriods(txs, now);
    expect(result.deltaPercent).toBe(-50);
  });

  it("returns null delta when prior was zero (avoids divide-by-zero)", () => {
    const txs = [
      { ...tx(0, 100), date: dateNDaysFrom(now, -5) },
    ];
    const result = comparePeriods(txs, now);
    expect(result.current).toBe(100);
    expect(result.prior).toBe(0);
    expect(result.deltaPercent).toBeNull();
  });
});

// Helper: date string N days from a given anchor "now".
function dateNDaysFrom(anchor: Date, daysOffset: number): string {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}
