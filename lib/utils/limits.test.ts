import { describe, it, expect } from "vitest";
import { MAX_AMOUNT_MESSAGE, roundWithinCap, tooLongMessage } from "./limits";

describe("limits", () => {
  it("states the amount cap the way people write it", () => {
    expect(MAX_AMOUNT_MESSAGE).toBe("Amount must be 9,999,999,999.99 or less.");
  });

  it("rounds to cents and reports null past the cap", () => {
    expect(roundWithinCap(12.345)).toBe(12.35);
    expect(roundWithinCap(9_999_999_999.994)).toBe(9_999_999_999.99);
    expect(roundWithinCap(9_999_999_999.999)).toBeNull();
  });

  it("builds the length message", () => {
    expect(tooLongMessage("note", 200)).toBe("Keep the note to 200 characters or fewer.");
  });
});
