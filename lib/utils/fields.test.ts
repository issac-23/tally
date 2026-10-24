import { describe, it, expect } from "vitest";
import {
  balanceMoney,
  isoDate,
  optionalIsoDate,
  optionalText,
  positiveMoney,
  recurrenceField,
  requiredText,
} from "./fields";
import { MAX_AMOUNT_MESSAGE } from "./limits";

describe("positiveMoney", () => {
  it("rounds to cents", () => {
    expect(positiveMoney("12.345")).toEqual({ ok: true, value: 12.35 });
  });

  it("rejects zero, negatives and anything that isn't a number", () => {
    for (const bad of [0, -1, NaN, Infinity, "abc"]) {
      expect(positiveMoney(bad)).toEqual({
        ok: false,
        error: "Amount must be greater than zero.",
      });
    }
  });

  it("rejects an amount that rounds to nothing", () => {
    expect(positiveMoney(0.004).ok).toBe(false);
  });

  it("rounds before comparing with the cap", () => {
    expect(positiveMoney(9_999_999_999.994)).toEqual({ ok: true, value: 9_999_999_999.99 });
    expect(positiveMoney(9_999_999_999.999)).toEqual({ ok: false, error: MAX_AMOUNT_MESSAGE });
  });
});

describe("balanceMoney", () => {
  it("allows zero", () => {
    expect(balanceMoney(0)).toEqual({ ok: true, value: 0 });
  });

  it("says why for a negative, a non-number and an over-cap balance", () => {
    expect(balanceMoney(-1)).toEqual({ ok: false, error: "Amounts can't be negative." });
    expect(balanceMoney(NaN)).toEqual({ ok: false, error: "Please enter valid numbers." });
    expect(balanceMoney(10_000_000_000)).toEqual({ ok: false, error: MAX_AMOUNT_MESSAGE });
  });
});

describe("text", () => {
  it("turns blank optional text into null and trims the rest", () => {
    expect(optionalText("   ", 10, "note")).toEqual({ ok: true, value: null });
    expect(optionalText(undefined, 10, "note")).toEqual({ ok: true, value: null });
    expect(optionalText(" hi ", 10, "note")).toEqual({ ok: true, value: "hi" });
  });

  it("names the field when it's too long", () => {
    expect(optionalText("x".repeat(11), 10, "note")).toEqual({
      ok: false,
      error: "Keep the note to 10 characters or fewer.",
    });
  });

  it("counts an emoji as one character, the way char_length does", () => {
    const atLimit = "😀".repeat(10);
    expect(atLimit.length).toBe(20);
    expect(optionalText(atLimit, 10, "note")).toEqual({ ok: true, value: atLimit });
    expect(requiredText(atLimit, 10, "name", "-")).toEqual({ ok: true, value: atLimit });
    expect(optionalText(atLimit + "😀", 10, "note").ok).toBe(false);
    expect(requiredText(atLimit + "😀", 10, "name", "-").ok).toBe(false);
  });

  it("requires text once trimmed", () => {
    expect(requiredText("  ", 10, "name", "Give it a name.")).toEqual({
      ok: false,
      error: "Give it a name.",
    });
    expect(requiredText(" Pay ", 10, "name", "Give it a name.")).toEqual({
      ok: true,
      value: "Pay",
    });
    expect(requiredText("x".repeat(11), 10, "name", "-").ok).toBe(false);
  });
});

describe("dates and recurrence", () => {
  it("accepts a real date and rejects one that only parses", () => {
    expect(isoDate("2026-02-28", "bad").ok).toBe(true);
    expect(isoDate("2026-02-31", "bad")).toEqual({ ok: false, error: "bad" });
    expect(optionalIsoDate("", "bad")).toEqual({ ok: true, value: null });
    expect(optionalIsoDate("2026-02-31", "bad").ok).toBe(false);
  });

  it("defaults to a one-off and checks against the allowed list", () => {
    expect(recurrenceField(undefined, "bad")).toEqual({ ok: true, value: "once" });
    expect(recurrenceField("fortnightly", "bad").ok).toBe(false);
    expect(recurrenceField("daily", "bad", [{ value: "weekly" }]).ok).toBe(false);
    expect(recurrenceField("weekly", "bad", [{ value: "weekly" }]).ok).toBe(true);
  });
});
