import { describe, it, expect, vi } from "vitest";
import { GENERIC_ERROR, logAndFail } from "./errors";

describe("logAndFail", () => {
  it("logs the real error and returns only the generic message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = { message: 'violates check constraint "transactions_amount_range"' };

    expect(logAndFail("createTransaction", cause)).toEqual({ error: GENERIC_ERROR });
    expect(spy).toHaveBeenCalledWith("createTransaction failed:", cause);

    spy.mockRestore();
  });
});
