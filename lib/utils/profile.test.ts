import { describe, it, expect } from "vitest";
import { validateProfileInput } from "./profile";

describe("validateProfileInput", () => {
  it("accepts zero", () => {
    expect(validateProfileInput(0)).toBeNull();
  });

  it("rejects a negative savings balance", () => {
    expect(validateProfileInput(-1)).toBe("Amounts can't be negative.");
  });

  it("rejects NaN", () => {
    expect(validateProfileInput(NaN)).toBe("Please enter valid numbers.");
  });

  it("rejects Infinity in both directions", () => {
    expect(validateProfileInput(Infinity)).toBe("Please enter valid numbers.");
    expect(validateProfileInput(-Infinity)).toBe("Please enter valid numbers.");
  });

  it("rejects a balance the numeric(12, 2) column can't hold", () => {
    expect(validateProfileInput(9_999_999_999.99)).toBeNull();
    expect(validateProfileInput(10_000_000_000)).toMatch(/or less/);
  });

  it("rounds to cents before checking the cap", () => {
    // Over the cap as typed, and 10 billion once rounded: numeric(12, 2)
    // would overflow.
    expect(validateProfileInput(9_999_999_999.999)).toMatch(/or less/);
    // Under the cap once rounded.
    expect(validateProfileInput(9_999_999_999.994)).toBeNull();
  });
});
