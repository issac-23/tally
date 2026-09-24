import { describe, it, expect } from "vitest";
import { validateProfileInput } from "./profile";

describe("validateProfileInput", () => {
  it("returns null for a valid non-negative number", () => {
    expect(validateProfileInput(1000)).toBeNull();
  });

  it("accepts zero", () => {
    expect(validateProfileInput(0)).toBeNull();
  });

  it("accepts large numbers", () => {
    expect(validateProfileInput(1_000_000)).toBeNull();
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

  it("treats the invalid-number check as higher priority than the negative check", () => {
    // NaN is technically not >= 0, but the clearer message is the one about
    // it not being a number.
    expect(validateProfileInput(NaN)).toBe("Please enter valid numbers.");
  });
});
