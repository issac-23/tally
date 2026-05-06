import { describe, it, expect } from "vitest";
import {
  runwayStatus,
  runwayLabel,
  monthlyBudgetLimit,
  calculateRunway,
} from "./runway";

describe("runwayStatus", () => {
  it("returns green at and above 6 months", () => {
    expect(runwayStatus(6)).toBe("green");
    expect(runwayStatus(12)).toBe("green");
    expect(runwayStatus(Infinity)).toBe("green");
  });

  it("returns yellow between 3 and 6 months (3 inclusive)", () => {
    expect(runwayStatus(3)).toBe("yellow");
    expect(runwayStatus(4.5)).toBe("yellow");
    expect(runwayStatus(5.99)).toBe("yellow");
  });

  it("returns orange between 1 and 3 months (1 inclusive)", () => {
    expect(runwayStatus(1)).toBe("orange");
    expect(runwayStatus(2)).toBe("orange");
    expect(runwayStatus(2.99)).toBe("orange");
  });

  it("returns red below 1 month", () => {
    expect(runwayStatus(0)).toBe("red");
    expect(runwayStatus(0.5)).toBe("red");
    expect(runwayStatus(0.99)).toBe("red");
  });
});

describe("runwayLabel", () => {
  it("shows 'Indefinite' for infinite runway", () => {
    expect(runwayLabel(Infinity)).toBe("Indefinite — you're saving");
  });

  it("formats sub-month runway in days", () => {
    expect(runwayLabel(0.5)).toBe("~15 days left");
    expect(runwayLabel(0)).toBe("~0 days left");
  });

  it("uses singular 'day' when exactly 1 day", () => {
    expect(runwayLabel(1 / 30)).toBe("~1 day left");
  });

  it("uses singular 'month' when exactly 1", () => {
    expect(runwayLabel(1)).toBe("~1 month left");
  });

  it("uses plural 'months' for multiple months", () => {
    expect(runwayLabel(5.5)).toBe("~5.5 months left");
    expect(runwayLabel(10)).toBe("~10 months left");
  });

  it("rounds months to one decimal", () => {
    expect(runwayLabel(5.27)).toBe("~5.3 months left");
    expect(runwayLabel(7.91)).toBe("~7.9 months left");
  });
});

describe("monthlyBudgetLimit", () => {
  it("returns salary + savings/12", () => {
    expect(monthlyBudgetLimit(12000, 3000)).toBe(4000);
  });

  it("equals salary when savings is zero", () => {
    expect(monthlyBudgetLimit(0, 5000)).toBe(5000);
  });

  it("equals savings/12 when salary is zero", () => {
    expect(monthlyBudgetLimit(24000, 0)).toBe(2000);
  });

  it("returns zero when both inputs are zero", () => {
    expect(monthlyBudgetLimit(0, 0)).toBe(0);
  });
});

describe("calculateRunway", () => {
  it("reports infinite runway when saving (salary > spend)", () => {
    const r = calculateRunway(10000, 3000, 1000);
    expect(r.months_remaining).toBe(Infinity);
    expect(r.status).toBe("green");
    expect(r.label).toBe("Indefinite — you're saving");
  });

  it("reports infinite runway at breakeven (salary == spend)", () => {
    const r = calculateRunway(10000, 3000, 3000);
    expect(r.months_remaining).toBe(Infinity);
    expect(r.status).toBe("green");
  });

  it("computes runway from savings divided by burn rate", () => {
    // burn = 4000 - 2000 = 2000/mo, savings = 12000 → 6 months
    const r = calculateRunway(12000, 2000, 4000);
    expect(r.months_remaining).toBe(6);
    expect(r.status).toBe("green");
  });

  it("flips to yellow when runway drops below 6 months", () => {
    // burn = 6000 - 2000 = 4000/mo, savings = 12000 → 3 months
    const r = calculateRunway(12000, 2000, 6000);
    expect(r.months_remaining).toBe(3);
    expect(r.status).toBe("yellow");
  });

  it("flips to orange when runway drops below 3 months", () => {
    // burn = 14000 - 2000 = 12000/mo, savings = 12000 → 1 month
    const r = calculateRunway(12000, 2000, 14000);
    expect(r.months_remaining).toBe(1);
    expect(r.status).toBe("orange");
  });

  it("flips to red when runway is under a month", () => {
    // burn = 2000/mo, savings = 1000 → 0.5 months
    const r = calculateRunway(1000, 2000, 4000);
    expect(r.months_remaining).toBe(0.5);
    expect(r.status).toBe("red");
  });

  it("returns 0 months when broke and still burning", () => {
    const r = calculateRunway(0, 2000, 3000);
    expect(r.months_remaining).toBe(0);
    expect(r.status).toBe("red");
  });

  it("returns infinite runway when broke but income covers spending", () => {
    const r = calculateRunway(0, 3000, 2000);
    expect(r.months_remaining).toBe(Infinity);
    expect(r.status).toBe("green");
  });

  it("includes monthly_avg_spend and budget limit in the result", () => {
    const r = calculateRunway(12000, 3000, 2000);
    expect(r.monthly_avg_spend).toBe(2000);
    expect(r.monthly_budget_limit).toBe(4000); // 3000 + 12000/12
  });
});
