import { describe, it, expect } from "vitest";
import {
  formatMonthSpan,
  runwayDelta,
  sliderCeiling,
  sliderStep,
} from "./scenario";

describe("sliderCeiling", () => {
  it("clears twice the current spend so you can explore spending more", () => {
    expect(sliderCeiling(3104, 4200)).toBeGreaterThanOrEqual(3104 * 2);
  });

  it("lands on a round number", () => {
    for (const [spend, salary] of [
      [3104, 4200],
      [1850, 1200],
      [412, 3800],
      [24_500, 30_000],
    ]) {
      const ceiling = sliderCeiling(spend, salary);
      const magnitude = 10 ** Math.floor(Math.log10(ceiling));
      expect([1, 2, 5, 10]).toContain(ceiling / magnitude);
    }
  });

  it("stays usable when there is no spending history yet", () => {
    // Salary still gives the slider a sensible span to explore.
    expect(sliderCeiling(0, 4200)).toBeGreaterThanOrEqual(4200 * 1.5);
  });

  it("has a floor so a brand-new account still gets a draggable range", () => {
    expect(sliderCeiling(0, 0)).toBeGreaterThanOrEqual(500);
  });
});

describe("sliderStep", () => {
  it("gives roughly a hundred stops", () => {
    const ceiling = sliderCeiling(3104, 4200);
    const stops = ceiling / sliderStep(ceiling);
    expect(stops).toBeGreaterThanOrEqual(10);
    expect(stops).toBeLessThanOrEqual(100);
  });

  it("is a round number", () => {
    for (const ceiling of [500, 1000, 2000, 5000, 10_000, 50_000]) {
      const step = sliderStep(ceiling);
      const magnitude = 10 ** Math.floor(Math.log10(step));
      expect([1, 2, 5, 10]).toContain(step / magnitude);
    }
  });

  it("divides the ceiling without a remainder, so the max is reachable", () => {
    for (const ceiling of [500, 1000, 2000, 5000, 10_000]) {
      expect(ceiling % sliderStep(ceiling)).toBe(0);
    }
  });
});

describe("runwayDelta", () => {
  it("reports a gain when the runway lengthens", () => {
    expect(runwayDelta(6, 9)).toEqual({ kind: "gain", months: 3 });
  });

  it("reports a loss when it shortens", () => {
    expect(runwayDelta(9, 6)).toEqual({ kind: "loss", months: 3 });
  });

  it("treats a sub-tenth-of-a-month change as no change", () => {
    expect(runwayDelta(6, 6.01).kind).toBe("same");
  });

  it("flags both-indefinite separately from a negligible change", () => {
    // Still saving either way, but the surplus differs — the caller words
    // that as "more into savings" rather than "no change".
    expect(runwayDelta(Infinity, Infinity)).toEqual({
      kind: "both-indefinite",
      months: 0,
    });
    expect(runwayDelta(6, 6.01).kind).toBe("same");
  });

  it("recognises crossing into saving", () => {
    expect(runwayDelta(6, Infinity).kind).toBe("becomes-indefinite");
  });

  it("recognises crossing out of saving", () => {
    expect(runwayDelta(Infinity, 8)).toEqual({
      kind: "loses-indefinite",
      months: 8,
    });
  });
});

describe("formatMonthSpan", () => {
  it("uses days below a month", () => {
    expect(formatMonthSpan(0.5)).toBe("15 days");
  });

  it("never says zero days", () => {
    expect(formatMonthSpan(0.001)).toBe("1 day");
  });

  it("singularises one month", () => {
    expect(formatMonthSpan(1)).toBe("1 month");
  });

  it("rounds to one decimal place", () => {
    expect(formatMonthSpan(3.44)).toBe("3.4 months");
  });
});
