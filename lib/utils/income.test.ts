import { describe, it, expect } from "vitest";
import { monthlyIncome, sourceMonthlyAmount } from "./income";

function source(overrides: Record<string, unknown> = {}) {
  return {
    id: "inc-1",
    name: "Salary",
    amount: 4200,
    recurrence: "monthly",
    ...overrides,
  };
}

describe("sourceMonthlyAmount", () => {
  it("passes a monthly amount through", () => {
    expect(sourceMonthlyAmount(source())).toBeCloseTo(4200, 6);
  });

  it("converts other cadences", () => {
    // 26 fortnightly paychecks a year, not 24.
    expect(sourceMonthlyAmount(source({ amount: 2000, recurrence: "biweekly" }))).toBeCloseTo(
      2000 * (365.25 / 12 / 7 / 2),
      6
    );
    expect(sourceMonthlyAmount(source({ amount: 12000, recurrence: "yearly" }))).toBeCloseTo(
      1000,
      6
    );
  });

  it("copes with an amount that arrives as a string", () => {
    // numeric(12,2) comes back from Postgres as a string.
    expect(sourceMonthlyAmount(source({ amount: "1500.50" }))).toBeCloseTo(1500.5, 6);
  });
});

describe("monthlyIncome", () => {
  it("is zero with no sources", () => {
    expect(monthlyIncome([])).toBe(0);
  });

  it("adds every source together", () => {
    const total = monthlyIncome([
      source({ id: "a", amount: 3000, recurrence: "monthly" }),
      source({ id: "b", amount: 12000, recurrence: "yearly" }),
    ]);
    expect(total).toBeCloseTo(4000, 6);
  });
});
