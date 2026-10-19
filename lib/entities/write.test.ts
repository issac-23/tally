import { describe, it, expect, vi } from "vitest";
import { GENERIC_ERROR } from "@/lib/utils/errors";
import { CATEGORY_UNAVAILABLE_MESSAGE } from "@/lib/supabase/categories";
import { failDb, knownDbError } from "./write";

// What Postgres reports for each rejection migration 008 can raise.
const rowCap = {
  code: "23514",
  message: "row limit reached: income_sources allows 50 rows per user",
};
const notYourCategory = {
  code: "23514",
  message: "category is not available to this user",
};
const lengthCheck = {
  code: "23514",
  message:
    'new row for relation "transactions" violates check constraint "transactions_merchant_length"',
};
const duplicate = { code: "23505", message: "duplicate key value" };

describe("knownDbError", () => {
  it("tells the three check_violation rejections apart", () => {
    const messages = { rowLimit: "Too many." };
    expect(knownDbError(rowCap, messages)).toBe("Too many.");
    expect(knownDbError(notYourCategory, messages)).toBe(CATEGORY_UNAVAILABLE_MESSAGE);
    expect(knownDbError(lengthCheck, messages)).toBeNull();
  });

  it("maps a duplicate only when the entity says what a duplicate means", () => {
    expect(knownDbError(duplicate, { duplicate: "Taken." })).toBe("Taken.");
    expect(knownDbError(duplicate, {})).toBeNull();
  });

  it("leaves other codes alone", () => {
    expect(knownDbError({ code: "42501", message: "row-level security" })).toBeNull();
    expect(knownDbError({})).toBeNull();
  });
});

describe("failDb", () => {
  it("logs and hides what it doesn't recognise", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(failDb("createThing", lengthCheck)).toEqual({ ok: false, error: GENERIC_ERROR });
    expect(spy).toHaveBeenCalledWith("createThing failed:", lengthCheck);
    spy.mockRestore();
  });

  it("doesn't log a rejection it can explain", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(failDb("createThing", rowCap, { rowLimit: "Too many." })).toEqual({
      ok: false,
      error: "Too many.",
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
