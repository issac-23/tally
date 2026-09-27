import { describe, it, expect } from "vitest";
import {
  incomeByMonth,
  isActiveIn,
  monthlyIncome,
  sourceMonthlyAmount,
  validateIncomeInput,
} from "./income";

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

describe("incomeByMonth", () => {
  it("returns months + 1 entries, starting with this month", () => {
    const schedule = incomeByMonth([source()], 3, new Date(2027, 0, 15));
    expect(schedule).toHaveLength(4);
    expect(schedule.every((n) => Math.abs(n - 4200) < 1e-6)).toBe(true);
  });

  it("drops a source partway through the window", () => {
    const sources = [
      source({ id: "a", amount: 3000 }),
      source({ id: "b", amount: 2000, ends_on: "2027-03-31" }),
    ];
    // Jan, Feb, Mar have both. April onwards has one.
    const schedule = incomeByMonth(sources, 4, new Date(2027, 0, 15));
    expect(schedule.map((n) => Math.round(n))).toEqual([5000, 5000, 5000, 3000, 3000]);
  });

  it("picks a source up partway through the window", () => {
    const sources = [source({ id: "b", amount: 2000, starts_on: "2027-03-01" })];
    const schedule = incomeByMonth(sources, 3, new Date(2027, 0, 15));
    expect(schedule.map((n) => Math.round(n))).toEqual([0, 0, 2000, 2000]);
  });

  it("doesn't skip a month when starting from the 31st", () => {
    // new Date(2027, 2, 31) + 1 month naively lands on 1 May, losing April.
    const sources = [source({ id: "b", amount: 2000, starts_on: "2027-04-01" })];
    const schedule = incomeByMonth(sources, 2, new Date(2027, 2, 31));
    expect(schedule.map((n) => Math.round(n))).toEqual([0, 2000, 2000]);
  });
});

describe("validateIncomeInput", () => {
  function input(overrides: Record<string, unknown> = {}) {
    return { name: "Salary", amount: 4200, recurrence: "monthly", ...overrides };
  }

  it("accepts a well-formed source", () => {
    const result = validateIncomeInput(input());
    expect(result).toEqual({
      ok: true,
      fields: {
        name: "Salary",
        amount: 4200,
        recurrence: "monthly",
        starts_on: null,
        ends_on: null,
      },
    });
  });

  it("requires a name", () => {
    expect(validateIncomeInput(input({ name: "   " }))).toMatchObject({ ok: false });
  });

  it.each([0, -1, "abc", Number.NaN])("rejects the amount %p", (amount) => {
    expect(validateIncomeInput(input({ amount }))).toMatchObject({ ok: false });
  });

  it("rejects cadences income can't have", () => {
    // A one-off payment isn't a source, and nobody is paid daily.
    expect(validateIncomeInput(input({ recurrence: "once" }))).toMatchObject({ ok: false });
    expect(validateIncomeInput(input({ recurrence: "daily" }))).toMatchObject({ ok: false });
  });

  it("rejects an end date before the start", () => {
    expect(
      validateIncomeInput(input({ starts_on: "2027-06-01", ends_on: "2027-05-31" }))
    ).toMatchObject({ ok: false, error: "It can't end before it starts." });
  });

  it("rejects a date that isn't a real calendar day", () => {
    expect(validateIncomeInput(input({ ends_on: "2027-02-30" }))).toMatchObject({ ok: false });
  });

  it("treats blank dates as absent", () => {
    const result = validateIncomeInput(input({ starts_on: "", ends_on: "  " }));
    expect(result).toMatchObject({ ok: true });
  });
});
