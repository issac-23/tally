import { describe, it, expect } from "vitest";
import { commitmentBreakdown } from "./commitments";

const HOUSING = { id: "cat-housing", name: "Housing", icon: "home", color: "#1d4ed8" };
const FUN = { id: "cat-fun", name: "Entertainment", icon: "tv", color: "#c026d3" };

function row(overrides: Record<string, unknown> = {}) {
  return {
    amount: 1850,
    date: "2026-09-01",
    merchant: "Greystar",
    recurrence: "monthly",
    category: HOUSING,
    ...overrides,
  };
}

describe("commitmentBreakdown", () => {
  it("returns an empty, zeroed summary for no commitments", () => {
    const summary = commitmentBreakdown([], 4200);
    expect(summary.commitments).toEqual([]);
    expect(summary.total).toBe(0);
    expect(summary.remaining).toBe(4200);
    expect(summary.shareOfIncome).toBe(0);
  });

  it("converts each cadence to a monthly cost", () => {
    const summary = commitmentBreakdown(
      [
        row({ amount: 1200, recurrence: "yearly", merchant: "Geico", category: null }),
        row({ amount: 15.99, recurrence: "monthly", merchant: "Netflix", category: FUN }),
      ],
      0
    );
    const byLabel = Object.fromEntries(summary.commitments.map((c) => [c.label, c.monthly]));
    expect(byLabel["Geico"]).toBeCloseTo(100, 6);
    expect(byLabel["Netflix"]).toBeCloseTo(15.99, 6);
    expect(summary.total).toBeCloseTo(115.99, 6);
  });

  it("collapses a commitment logged every month into one entry", () => {
    // Twelve months of rent is one commitment, not $22,200/mo of them.
    const months = ["01", "02", "03", "04", "05"].map((m) =>
      row({ date: `2026-${m}-01` })
    );
    const summary = commitmentBreakdown(months, 4200);
    expect(summary.commitments).toHaveLength(1);
    expect(summary.total).toBeCloseTo(1850, 6);
  });

  it("takes the newest amount when a commitment changes price", () => {
    const summary = commitmentBreakdown(
      [row({ amount: 1950, date: "2026-09-01" }), row({ amount: 1850, date: "2026-08-01" })],
      4200
    );
    expect(summary.commitments[0].amount).toBe(1950);
  });

  it("ignores one-off expenses", () => {
    const summary = commitmentBreakdown(
      [row({ recurrence: "once", merchant: "Uniqlo", category: null }), row()],
      4200
    );
    expect(summary.commitments.map((c) => c.label)).toEqual(["Greystar"]);
  });

  it("sorts by monthly cost, not by the logged amount", () => {
    // $1,200/yr looks bigger than $200/mo until you normalise it.
    const summary = commitmentBreakdown(
      [
        row({ amount: 1200, recurrence: "yearly", merchant: "Geico", category: null }),
        row({ amount: 200, recurrence: "monthly", merchant: "Gym", category: FUN }),
      ],
      4200
    );
    expect(summary.commitments.map((c) => c.label)).toEqual(["Gym", "Geico"]);
  });

  it("falls back from merchant to note to category for the label", () => {
    const summary = commitmentBreakdown(
      [
        row({ merchant: "  ", description: "Storage unit", category: null }),
        row({ merchant: null, description: null, recurrence: "yearly" }),
        row({ merchant: null, description: null, category: null, recurrence: "weekly" }),
      ],
      4200
    );
    expect(summary.commitments.map((c) => c.label).sort()).toEqual([
      "Housing",
      "Recurring expense",
      "Storage unit",
    ]);
  });

  it("reports what's left of the income and the share it eats", () => {
    const summary = commitmentBreakdown([row({ amount: 2100 })], 4200);
    expect(summary.remaining).toBeCloseTo(2100, 6);
    expect(summary.shareOfIncome).toBeCloseTo(0.5, 6);
  });

  it("lets the remainder go negative rather than clamping it", () => {
    const summary = commitmentBreakdown([row({ amount: 5000 })], 4200);
    expect(summary.remaining).toBeCloseTo(-800, 6);
    expect(summary.shareOfIncome).toBeGreaterThan(1);
  });

  it("reports nothing about income when there isn't one", () => {
    for (const salary of [0, -1, Number.NaN]) {
      const summary = commitmentBreakdown([row()], salary);
      expect(summary.remaining).toBeNull();
      expect(summary.shareOfIncome).toBeNull();
    }
  });

  it("keeps a stable key per commitment", () => {
    const first = commitmentBreakdown([row()], 4200).commitments[0].key;
    const second = commitmentBreakdown([row({ amount: 1950 })], 4200).commitments[0].key;
    // Keyed on identity, not price, so a rent rise isn't a new commitment.
    expect(first).toBe(second);
  });
});
