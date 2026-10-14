import { describe, it, expect } from "vitest";
import { canUseCategory } from "./category-access";
import { createFixtureStore } from "@/lib/dev/fixtures";
import type { Store, StoreResult } from "@/lib/store/types";
import type { CategoryRecord } from "@/lib/store/types";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";

/** Answers every lookup with one fixed result, as if RLS had let it through. */
function storeFinding(result: StoreResult<CategoryRecord | null>): Store {
  return { categories: { find: async () => result } } as unknown as Store;
}

const category = (user_id: string | null, is_preset: boolean): CategoryRecord => ({
  id: "c1",
  user_id,
  is_preset,
  name: "x",
  icon: "tag",
  color: "#111111",
});

describe("canUseCategory", () => {
  const store = createFixtureStore({ scenario: "full:categories" });

  it("allows a preset", async () => {
    expect(await canUseCategory(store, USER_ID, "cat-food")).toBe(true);
  });

  it("allows the user's own category", async () => {
    expect(await canUseCategory(store, USER_ID, "cat-fx-books")).toBe(true);
  });

  it("rejects an id that doesn't exist", async () => {
    expect(await canUseCategory(store, USER_ID, "cat-nope")).toBe(false);
  });

  it("rejects someone else's category even if the row comes back", async () => {
    const other = storeFinding({ ok: true, value: category(OTHER_USER_ID, false) });
    expect(await canUseCategory(other, USER_ID, "c1")).toBe(false);
  });

  it("rejects when the lookup fails", async () => {
    const broken = storeFinding({ ok: false, error: { kind: "failed", cause: new Error("boom") } });
    expect(await canUseCategory(broken, USER_ID, "x")).toBe(false);
  });
});
