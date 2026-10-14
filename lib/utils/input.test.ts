import { describe, it, expect } from "vitest";
import { blankToNull, isIsoDate } from "./input";

describe("blankToNull", () => {
  it("trims, and turns blank or missing values into null", () => {
    expect(blankToNull("  hello ")).toBe("hello");
    expect(blankToNull("   ")).toBeNull();
    expect(blankToNull(undefined)).toBeNull();
    expect(blankToNull(null)).toBeNull();
  });
});

describe("isIsoDate", () => {
  it("accepts real dates and rejects roll-overs and non-dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate(20260228)).toBe(false);
  });
});
