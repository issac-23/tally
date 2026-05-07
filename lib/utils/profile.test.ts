import { describe, it, expect } from "vitest";
import { validateProfileInput } from "./profile";

describe("validateProfileInput", () => {
  it("returns null for valid non-negative numbers", () => {
    expect(validateProfileInput(1000, 3000)).toBeNull();
  });

  it("accepts zero values", () => {
    expect(validateProfileInput(0, 0)).toBeNull();
  });

  it("accepts large numbers", () => {
    expect(validateProfileInput(1_000_000, 50_000)).toBeNull();
  });

  it("rejects negative savings balance", () => {
    expect(validateProfileInput(-1, 3000)).toBe("Amounts can't be negative.");
  });

  it("rejects negative monthly salary", () => {
    expect(validateProfileInput(1000, -1)).toBe("Amounts can't be negative.");
  });

  it("rejects NaN values", () => {
    expect(validateProfileInput(NaN, 3000)).toBe("Please enter valid numbers.");
    expect(validateProfileInput(1000, NaN)).toBe("Please enter valid numbers.");
  });

  it("rejects Infinity", () => {
    expect(validateProfileInput(Infinity, 3000)).toBe(
      "Please enter valid numbers."
    );
  });

  it("rejects -Infinity", () => {
    expect(validateProfileInput(1000, -Infinity)).toBe(
      "Please enter valid numbers."
    );
  });

  it("treats invalid-number check as higher priority than negative check", () => {
    // NaN is technically not >= 0, but we want the user to see the clearer
    // 'invalid number' message rather than 'negative'.
    expect(validateProfileInput(NaN, NaN)).toBe(
      "Please enter valid numbers."
    );
  });
});
