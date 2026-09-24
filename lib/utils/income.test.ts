import { describe, it, expect } from "vitest";
import { isActiveIn, monthlyIncome, sourceMonthlyAmount } from "./income";

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

describe("isActiveIn", () => {
  const march = new Date(2027, 2, 15); // 2027-03-15

  it("is active when both dates are open", () => {
    expect(isActiveIn(source(), march)).toBe(true);
  });

  it("isn't active before it starts", () => {
    expect(isActiveIn(source({ starts_on: "2027-04-01" }), march)).toBe(false);
  });

  it("is active in its starting month, whatever the day", () => {
    expect(isActiveIn(source({ starts_on: "2027-03-28" }), march)).toBe(true);
  });

  it("isn't active after it ends", () => {
    expect(isActiveIn(source({ ends_on: "2027-02-28" }), march)).toBe(false);
  });

  it("still pays in its final month", () => {
    // A contract ending on the 14th still paid that month.
    expect(isActiveIn(source({ ends_on: "2027-03-14" }), march)).toBe(true);
  });

  it("handles a source bounded on both sides", () => {
    const bounded = source({ starts_on: "2027-01-01", ends_on: "2027-06-30" });
    expect(isActiveIn(bounded, new Date(2026, 11, 31))).toBe(false);
    expect(isActiveIn(bounded, march)).toBe(true);
    expect(isActiveIn(bounded, new Date(2027, 6, 1))).toBe(false);
  });
});

describe("monthlyIncome with dates", () => {
  it("drops a source whose contract has ended", () => {
    const sources = [
      source({ id: "a", amount: 3000 }),
      source({ id: "b", amount: 2000, ends_on: "2027-02-28" }),
    ];
    expect(monthlyIncome(sources, new Date(2027, 1, 10))).toBeCloseTo(5000, 6);
    expect(monthlyIncome(sources, new Date(2027, 2, 10))).toBeCloseTo(3000, 6);
  });
});
