import { describe, it, expect } from "vitest";
import {
  hasChanges,
  validateTransactionInput,
  type TransactionFields,
} from "./transaction-input";

const TODAY = "2026-09-13";

function valid(overrides: Record<string, unknown> = {}) {
  return {
    amount: 12.5,
    category_id: "cat-food",
    date: "2026-09-01",
    recurrence: "once",
    ...overrides,
  };
}

function fieldsOf(result: ReturnType<typeof validateTransactionInput>) {
  if (!result.ok) throw new Error(`expected valid, got: ${result.error}`);
  return result.fields;
}

describe("validateTransactionInput", () => {
  it("accepts a well-formed expense", () => {
    const fields = fieldsOf(validateTransactionInput(valid(), TODAY));
    expect(fields).toEqual({
      amount: 12.5,
      category_id: "cat-food",
      description: null,
      merchant: null,
      date: "2026-09-01",
      recurrence: "once",
    });
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY, "abc"])(
    "rejects the amount %p",
    (amount) => {
      const result = validateTransactionInput(valid({ amount }), TODAY);
      expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/amount/i) });
    }
  );

  it("rounds a sub-cent amount instead of rejecting it", () => {
    expect(fieldsOf(validateTransactionInput(valid({ amount: 12.345 }), TODAY)).amount).toBe(12.35);
    expect(fieldsOf(validateTransactionInput(valid({ amount: "8.009" }), TODAY)).amount).toBe(8.01);
  });

  it("requires a category", () => {
    expect(validateTransactionInput(valid({ category_id: "" }), TODAY)).toMatchObject({
      ok: false,
      error: "Pick a category.",
    });
  });

  it("rejects a date that isn't a real calendar day", () => {
    // new Date("2026-02-31") rolls over to March rather than failing.
    expect(validateTransactionInput(valid({ date: "2026-02-31" }), TODAY)).toMatchObject({
      ok: false,
    });
    expect(validateTransactionInput(valid({ date: "09/01/2026" }), TODAY)).toMatchObject({
      ok: false,
    });
    expect(validateTransactionInput(valid({ date: "" }), TODAY)).toMatchObject({ ok: false });
  });

  it("accepts today but not tomorrow", () => {
    expect(validateTransactionInput(valid({ date: TODAY }), TODAY).ok).toBe(true);
    expect(validateTransactionInput(valid({ date: "2026-09-14" }), TODAY)).toMatchObject({
      ok: false,
      error: "That date is in the future.",
    });
  });

  it("rejects a typo'd year", () => {
    expect(validateTransactionInput(valid({ date: "0226-09-01" }), TODAY)).toMatchObject({
      ok: false,
      error: "That date is too far in the past.",
    });
  });

  it("rejects an unknown recurrence", () => {
    expect(validateTransactionInput(valid({ recurrence: "fortnightly" }), TODAY)).toMatchObject({
      ok: false,
    });
  });

  it("defaults a missing recurrence to once", () => {
    expect(fieldsOf(validateTransactionInput(valid({ recurrence: undefined }), TODAY)).recurrence).toBe(
      "once"
    );
  });

  it("trims text and stores blanks as null", () => {
    const fields = fieldsOf(
      validateTransactionInput(valid({ merchant: "  Blue Bottle  ", description: "   " }), TODAY)
    );
    expect(fields.merchant).toBe("Blue Bottle");
    expect(fields.description).toBeNull();
  });
});

describe("hasChanges", () => {
  const before: TransactionFields = {
    amount: 12.5,
    category_id: "cat-food",
    description: null,
    merchant: "Blue Bottle",
    date: "2026-09-01",
    recurrence: "once",
  };

  it("is false when nothing moved", () => {
    expect(hasChanges(before, { ...before })).toBe(false);
  });

  it.each([
    ["amount", { amount: 12.51 }],
    ["category", { category_id: "cat-other" }],
    ["note", { description: "lunch" }],
    ["merchant", { merchant: "blue bottle" }],
    ["date", { date: "2026-09-02" }],
    ["recurrence", { recurrence: "monthly" as const }],
  ])("is true when the %s changed", (_label, patch) => {
    expect(hasChanges(before, { ...before, ...patch })).toBe(true);
  });
});
