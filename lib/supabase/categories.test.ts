import { describe, it, expect } from "vitest";
import { canUseCategory } from "./categories";
import { createFixtureClient } from "@/lib/dev/fixtures";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";

/** Answers every lookup with one fixed result, as if RLS had let it through. */
function clientReturning(row: Record<string, unknown> | null, error: unknown = null) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: row, error }),
  };
  return { from: () => query } as never;
}

describe("canUseCategory", () => {
  const supabase = createFixtureClient({ scenario: "full:categories" }) as never;

  it("allows a preset", async () => {
    expect(await canUseCategory(supabase, USER_ID, "cat-food")).toBe(true);
  });

  it("allows the user's own category", async () => {
    expect(await canUseCategory(supabase, USER_ID, "cat-fx-books")).toBe(true);
  });

  it("rejects an id that doesn't exist", async () => {
    expect(await canUseCategory(supabase, USER_ID, "cat-nope")).toBe(false);
  });

  it("rejects someone else's category even if the row comes back", async () => {
    const client = clientReturning({ id: "c1", user_id: OTHER_USER_ID, is_preset: false });
    expect(await canUseCategory(client, USER_ID, "c1")).toBe(false);
  });

  it("rejects when the lookup errors", async () => {
    const client = clientReturning(null, { message: "invalid input syntax for type uuid" });
    expect(await canUseCategory(client, USER_ID, "x")).toBe(false);
  });
});
