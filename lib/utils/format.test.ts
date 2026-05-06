import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyCompact } from "./format";

describe("formatCurrency", () => {
  it("formats zero with cents (small-amount default)", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("shows cents for amounts under $100 by default", () => {
    expect(formatCurrency(5.5)).toBe("$5.50");
    expect(formatCurrency(99.99)).toBe("$99.99");
  });

  it("hides cents for amounts of $100 or more by default", () => {
    expect(formatCurrency(100)).toBe("$100");
    expect(formatCurrency(1234)).toBe("$1,234");
  });

  it("respects showCents=true for amounts >= $100", () => {
    expect(formatCurrency(1234, { showCents: true })).toBe("$1,234.00");
  });

  it("respects showCents=false for amounts < $100", () => {
    expect(formatCurrency(5.5, { showCents: false })).toBe("$6");
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-5.5)).toBe("-$5.50");
  });

  it("rounds to two decimal places when showing cents", () => {
    expect(formatCurrency(1.005)).toBe("$1.01");
  });

  it("inserts thousands separators on large numbers", () => {
    expect(formatCurrency(1234567)).toBe("$1,234,567");
  });
});

describe("formatCurrencyCompact", () => {
  it("formats small amounts as plain dollars", () => {
    expect(formatCurrencyCompact(500)).toBe("$500");
  });

  it("formats thousands compactly", () => {
    expect(formatCurrencyCompact(1500)).toBe("$1.5K");
  });

  it("formats millions compactly", () => {
    expect(formatCurrencyCompact(2_500_000)).toBe("$2.5M");
  });

  it("formats zero", () => {
    expect(formatCurrencyCompact(0)).toBe("$0");
  });
});
