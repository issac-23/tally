import { describe, it, expect } from "vitest";
import { projectSavings } from "./projection";

describe("projectSavings", () => {
  it("returns months+1 points (0 through months inclusive)", () => {
    const result = projectSavings(1000, 100, 50, 12);
    expect(result.points).toHaveLength(13);
    expect(result.points[0].month).toBe(0);
    expect(result.points[12].month).toBe(12);
  });

  it("uses 12 months as the default window", () => {
    const result = projectSavings(1000, 100, 50);
    expect(result.points).toHaveLength(13);
  });

  it("starts at the current savings on month 0", () => {
    const result = projectSavings(5000, 0, 0);
    expect(result.points[0].balance).toBe(5000);
  });

  it("grows when salary exceeds spending (saving case)", () => {
    const result = projectSavings(1000, 500, 300, 6);
    // Net +200/mo: 1000, 1200, 1400, 1600, 1800, 2000, 2200
    expect(result.points[0].balance).toBe(1000);
    expect(result.points[6].balance).toBe(2200);
    expect(result.isDepleting).toBe(false);
    expect(result.depletionMonth).toBeNull();
  });

  it("stays flat at breakeven (salary == spending)", () => {
    const result = projectSavings(1000, 500, 500, 6);
    for (const p of result.points) {
      expect(p.balance).toBe(1000);
    }
    expect(result.isDepleting).toBe(false);
  });

  it("declines when spending exceeds salary (burning case)", () => {
    const result = projectSavings(1000, 200, 500, 12);
    // Net -300/mo, savings 1000, depletes in 1000/300 = 3.33 months
    expect(result.points[0].balance).toBe(1000);
    expect(result.points[3].balance).toBe(100); // 1000 - 900
    expect(result.points[4].balance).toBe(0);   // floored at zero
    expect(result.isDepleting).toBe(true);
  });

  it("floors balance at zero after depletion", () => {
    const result = projectSavings(100, 0, 100, 6);
    // Depletes after 1 month
    expect(result.points[2].balance).toBe(0);
    expect(result.points[6].balance).toBe(0);
  });

  it("identifies the exact depletion month within the window", () => {
    // 1000 savings, burning 250/mo → 4 months exactly
    const result = projectSavings(1000, 0, 250, 12);
    expect(result.depletionMonth).toBe(4);
  });

  it("returns a fractional depletion month when not on a boundary", () => {
    // 1000 savings, burning 300/mo → 3.333... months
    const result = projectSavings(1000, 0, 300, 12);
    expect(result.depletionMonth).toBeCloseTo(3.333, 2);
  });

  it("returns null depletion when burn pace pushes depletion beyond the window", () => {
    // 10000 savings, burning 100/mo → 100 months, far past the 12-month window
    const result = projectSavings(10000, 0, 100, 12);
    expect(result.depletionMonth).toBeNull();
    // Last point should still be > 0
    expect(result.points[12].balance).toBeGreaterThan(0);
  });

  it("returns null depletion when not burning at all", () => {
    const saving = projectSavings(1000, 500, 200, 12);
    expect(saving.depletionMonth).toBeNull();

    const breakeven = projectSavings(1000, 500, 500, 12);
    expect(breakeven.depletionMonth).toBeNull();
  });

  it("reports depletion at month 0 if savings start at zero with negative net", () => {
    const result = projectSavings(0, 100, 200, 12);
    expect(result.depletionMonth).toBe(0);
    expect(result.points.every((p) => p.balance === 0)).toBe(true);
  });

  it("computes monthlyNet as salary minus spend", () => {
    expect(projectSavings(1000, 500, 200).monthlyNet).toBe(300);
    expect(projectSavings(1000, 200, 500).monthlyNet).toBe(-300);
    expect(projectSavings(1000, 500, 500).monthlyNet).toBe(0);
  });
});

describe("projectSavings with income that changes", () => {
  it("matches the flat number when every month is the same", () => {
    const flat = projectSavings(10000, 2000, 2500);
    const schedule = projectSavings(10000, Array(13).fill(2000), 2500);
    expect(schedule.points).toEqual(flat.points);
    expect(schedule.depletionMonth).toBe(flat.depletionMonth);
  });

  it("bends the line when a contract ends", () => {
    // 3 months at break-even, then income halves and it starts draining.
    const income = [3000, 3000, 3000, 1000, 1000, 1000, 1000, 1000];
    const result = projectSavings(4000, income, 3000);
    expect(result.points[3].balance).toBe(4000);
    expect(result.points[4].balance).toBe(2000);
    expect(result.points[5].balance).toBe(0);
  });

  it("finds the crossing in the month it actually happens", () => {
    const income = [3000, 3000, 1000, 1000, 1000, 1000, 1000, 1000];
    const result = projectSavings(3000, income, 3000);
    // Flat until month 2, then -2000/mo against 3000 saved.
    expect(result.depletionMonth).toBeCloseTo(3.5, 6);
    expect(result.isDepleting).toBe(true);
  });

  it("reports not depleting when income arrives before the money runs out", () => {
    const income = [0, 0, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000];
    const result = projectSavings(10000, income, 3000);
    expect(result.depletionMonth).toBeNull();
    expect(result.points[12].balance).toBeGreaterThan(10000);
  });

  it("holds the last value when the schedule is shorter than the window", () => {
    const result = projectSavings(10000, [2000, 1000], 1000);
    // Month 1 uses 2000, everything after uses 1000 — so break-even.
    expect(result.points[1].balance).toBe(11000);
    expect(result.points[12].balance).toBe(11000);
  });

  it("treats an empty schedule as no income at all", () => {
    const result = projectSavings(1200, [], 100);
    expect(result.depletionMonth).toBeCloseTo(12, 6);
  });
});
