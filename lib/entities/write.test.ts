import { describe, it, expect, vi } from "vitest";
import { GENERIC_ERROR } from "@/lib/utils/errors";
import { CATEGORY_UNAVAILABLE_MESSAGE } from "./category-access";
import { failStore } from "./write";

const failure = { kind: "failed", cause: new Error("check constraint") } as const;

describe("failStore", () => {
  it("explains a rejection the user can act on", () => {
    const messages = { duplicate: "Taken.", rowLimit: "Too many." };
    expect(failStore("act", { kind: "duplicate" }, messages)).toEqual({ ok: false, error: "Taken." });
    expect(failStore("act", { kind: "row-limit" }, messages)).toEqual({ ok: false, error: "Too many." });
    expect(failStore("act", { kind: "category-unavailable" })).toEqual({
      ok: false,
      error: CATEGORY_UNAVAILABLE_MESSAGE,
    });
  });

  it("doesn't log a rejection it can explain", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    failStore("act", { kind: "row-limit" }, { rowLimit: "Too many." });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs the real cause and hides it behind the generic message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(failStore("createThing", failure)).toEqual({ ok: false, error: GENERIC_ERROR });
    expect(spy).toHaveBeenCalledWith("createThing failed:", failure.cause);
    spy.mockRestore();
  });

  it("treats a duplicate or cap the entity has no message for as a failure", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(failStore("act", { kind: "duplicate" })).toEqual({ ok: false, error: GENERIC_ERROR });
    expect(failStore("act", { kind: "row-limit" })).toEqual({ ok: false, error: GENERIC_ERROR });
    spy.mockRestore();
  });
});
