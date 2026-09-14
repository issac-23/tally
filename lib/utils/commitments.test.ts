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
    const summary = commitmentBreakdown([]);
    expect(summary.commitments).toEqual([]);
    expect(summary.total).toBe(0);
  });

  it("converts each cadence to a monthly cost", () => {
    const summary = commitmentBreakdown([
      row({ amount: 1200, recurrence: "yearly", merchant: "Geico", category: null }),
      row({ amount: 15.99, recurrence: "monthly", merchant: "Netflix", category: FUN }),
    ]);
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
    const summary = commitmentBreakdown(months);
    expect(summary.commitments).toHaveLength(1);
    expect(summary.total).toBeCloseTo(1850, 6);
  });

  it("takes the newest amount when a commitment changes price", () => {
    const summary = commitmentBreakdown([
      row({ amount: 1950, date: "2026-09-01" }),
      row({ amount: 1850, date: "2026-08-01" }),
    ]);
    expect(summary.commitments[0].amount).toBe(1950);
  });

  it("ignores one-off expenses", () => {
    const summary = commitmentBreakdown([
      row({ recurrence: "once", merchant: "Uniqlo", category: null }),
      row(),
    ]);
    expect(summary.commitments.map((c) => c.label)).toEqual(["Greystar"]);
  });

  it("keeps a stable key per commitment", () => {
    const first = commitmentBreakdown([row()]).commitments[0].key;
    const second = commitmentBreakdown([row({ amount: 1950 })]).commitments[0].key;
    // Keyed on identity, not price, so a rent rise isn't a new commitment.
    expect(first).toBe(second);
  });
});
