import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFixtureStore, resetFixtureStores } from "@/lib/dev/fixtures";
import { addDays, latestDayOnEarth } from "@/lib/utils/calendar";
import { GENERIC_ERROR } from "@/lib/utils/errors";
import type { Store, StoreError, StoreResult } from "@/lib/store/types";
import { CATEGORY_UNAVAILABLE_MESSAGE } from "./category-access";
import { createTransaction, deleteTransaction, updateTransaction } from "./transaction";
import { createIncomeSource, deleteIncomeSource } from "./income-source";
import { createCategory, deleteCategory } from "./category";
import { completeOnboarding, updateSavings } from "./profile";
import type { WriteResult } from "./write";

const USER_ID = "00000000-0000-4000-8000-000000000001";

function fixture(scenario = "full"): Store {
  return createFixtureStore({ scenario });
}

/**
 * A store whose inserts all come back with `error` and whose category lookup
 * finds a preset, for the rejections the module has to turn into messages.
 * (The in-memory store raises the real ones, and its own tests cover when.)
 */
function rejecting(error: StoreError): Store {
  const refused = async (): Promise<StoreResult<never>> => ({ ok: false, error });
  return {
    categories: {
      find: async () => ({
        ok: true,
        value: { id: "cat-food", user_id: null, is_preset: true, name: "Food", icon: "x", color: "#111111" },
      }),
      add: refused,
    },
    transactions: { add: refused },
    incomeSources: { add: refused },
  } as unknown as Store;
}

function paths(result: WriteResult): string[] {
  return result.ok ? result.refresh.map((r) => r.path) : [];
}

async function firstTransactionId(store: Store): Promise<string> {
  const all = await store.transactions.listAll();
  if (!all.ok) throw new Error("read failed");
  return all.value[0].id;
}

const expense = {
  amount: 12.5,
  category_id: "cat-food",
  description: "Lunch",
  merchant: "Sweetgreen",
  date: "2020-01-15",
  recurrence: "once",
};

beforeEach(() => {
  resetFixtureStores();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("transaction writes", () => {
  it("creates an expense and refreshes the pages that show it", async () => {
    const store = fixture("empty");
    const result = await createTransaction(store, USER_ID, expense);
    expect(paths(result)).toEqual(["/dashboard", "/transactions"]);

    const all = await store.transactions.listAll();
    expect(all.ok && all.value).toHaveLength(1);
  });

  it("says why before touching the store", async () => {
    const result = await createTransaction(fixture("empty"), USER_ID, { ...expense, amount: 0 });
    expect(result).toEqual({ ok: false, error: "Amount must be greater than zero." });
  });

  it("turns down a category the user can't use", async () => {
    const result = await createTransaction(fixture("empty"), USER_ID, {
      ...expense,
      category_id: "cat-nope",
    });
    expect(result).toEqual({ ok: false, error: CATEGORY_UNAVAILABLE_MESSAGE });
  });

  it("maps the row cap and the ownership rejection to their own messages", async () => {
    const capped = await createTransaction(rejecting({ kind: "row-limit" }), USER_ID, expense);
    expect(capped).toEqual({
      ok: false,
      error: "You've reached the limit of 10,000 expenses.",
    });

    // The pre-check passed, then the store refused it anyway: a race with a
    // category being deleted.
    const raced = await createTransaction(
      rejecting({ kind: "category-unavailable" }),
      USER_ID,
      expense
    );
    expect(raced).toEqual({ ok: false, error: CATEGORY_UNAVAILABLE_MESSAGE });
  });

  it("only calls a date future once no time zone has reached it", async () => {
    const store = fixture("empty");
    // A browser east of the server defaults to a day the server hasn't
    // reached yet; that has to go through.
    const edge = latestDayOnEarth();
    expect((await createTransaction(store, USER_ID, { ...expense, date: edge })).ok).toBe(true);

    expect(
      await createTransaction(store, USER_ID, { ...expense, date: addDays(edge, 1) })
    ).toEqual({ ok: false, error: "That date is in the future." });
  });

  it("hides a database failure behind the generic message", async () => {
    const result = await createTransaction(fixture("error"), USER_ID, expense);
    expect(result).toEqual({ ok: false, error: GENERIC_ERROR });
  });

  it("edits an expense, and also refreshes its edit page", async () => {
    const store = fixture("full");
    const id = await firstTransactionId(store);

    const result = await updateTransaction(store, USER_ID, id, { ...expense, amount: 99 });
    expect(paths(result)).toEqual(["/dashboard", "/transactions", "/transactions/[id]/edit"]);
    expect(result.ok && result.refresh[2].type).toBe("page");

    const row = await store.transactions.get(USER_ID, id);
    expect(row.ok && row.value?.amount).toBe(99);
  });

  it("reports an edit to an expense that's gone", async () => {
    const result = await updateTransaction(fixture("full"), USER_ID, "fx-tx-nope", expense);
    expect(result).toEqual({ ok: false, error: "That expense no longer exists." });
  });

  it("deletes an expense, and deleting one that's already gone is fine", async () => {
    const store = fixture("full");
    const id = await firstTransactionId(store);

    expect((await deleteTransaction(store, USER_ID, id)).ok).toBe(true);
    expect(await store.transactions.get(USER_ID, id)).toEqual({ ok: true, value: null });
    expect((await deleteTransaction(store, USER_ID, id)).ok).toBe(true);
  });

  it("needs an id to edit or delete", async () => {
    expect(await deleteTransaction(fixture(), USER_ID, "")).toEqual({
      ok: false,
      error: "Missing transaction id.",
    });
    expect((await updateTransaction(fixture(), USER_ID, "", expense)).ok).toBe(false);
  });
});

describe("income source writes", () => {
  const input = { name: "Retainer", amount: 1500, recurrence: "monthly" };

  it("creates and deletes a source, refreshing the dashboard and settings", async () => {
    const store = fixture("empty");
    const created = await createIncomeSource(store, USER_ID, input);
    expect(paths(created)).toEqual(["/dashboard", "/settings"]);

    const list = await store.incomeSources.list();
    const added = list.ok ? list.value.find((s) => s.name === "Retainer") : undefined;
    expect(added).toBeDefined();

    const deleted = await deleteIncomeSource(store, USER_ID, added!.id);
    expect(paths(deleted)).toEqual(["/dashboard", "/settings"]);
  });

  it("rejects what the validator rejects", async () => {
    const result = await createIncomeSource(fixture("empty"), USER_ID, { ...input, name: " " });
    expect(result).toEqual({ ok: false, error: "Give it a name." });
  });

  it("maps the row cap to a message naming the limit", async () => {
    const result = await createIncomeSource(rejecting({ kind: "row-limit" }), USER_ID, input);
    expect(result).toEqual({
      ok: false,
      error: "You've reached the limit of 50 income sources.",
    });
  });
});

describe("category writes", () => {
  it("creates a category and refreshes every page that lists categories", async () => {
    const result = await createCategory(fixture("empty"), USER_ID, "Pets", "#112233");
    expect(paths(result)).toEqual([
      "/settings",
      "/transactions/new",
      "/transactions/[id]/edit",
      "/dashboard",
    ]);
  });

  it("explains a duplicate name, but only an exact one", async () => {
    const store = fixture("empty");
    await createCategory(store, USER_ID, "Pets", "#112233");
    expect(await createCategory(store, USER_ID, "Pets", "#112233")).toEqual({
      ok: false,
      error: "You already have a category with that name.",
    });
    // Postgres' unique index doesn't fold case, so neither does the store.
    expect((await createCategory(store, USER_ID, "pets", "#112233")).ok).toBe(true);
  });

  it("validates the name and the colour", async () => {
    const store = fixture("empty");
    expect((await createCategory(store, USER_ID, "a", "#112233")).ok).toBe(false);
    expect(await createCategory(store, USER_ID, "x".repeat(33), "#112233")).toEqual({
      ok: false,
      error: "Category name must be 32 characters or fewer.",
    });
    expect(await createCategory(store, USER_ID, "Pets", "red")).toEqual({
      ok: false,
      error: "Choose a valid category color.",
    });
  });

  it("maps the row cap to a message naming the limit", async () => {
    const result = await createCategory(
      rejecting({ kind: "row-limit" }),
      USER_ID,
      "Pets",
      "#112233"
    );
    expect(result).toEqual({
      ok: false,
      error: "You've reached the limit of 100 custom categories.",
    });
  });

  it("deletes a category and also refreshes the expense list it was on", async () => {
    const result = await deleteCategory(fixture("full"), USER_ID, "cat-fx-books");
    expect(paths(result)).toContain("/transactions");
    expect(paths(result)).toContain("/transactions/[id]/edit");
  });
});

describe("profile writes", () => {
  it("updates the savings balance, rounded to cents", async () => {
    const store = fixture("full");
    const result = await updateSavings(store, USER_ID, 1234.567);
    expect(paths(result)).toEqual(["/dashboard", "/settings"]);

    const profile = await store.profiles.get(USER_ID);
    expect(profile.ok && profile.value?.savings_balance).toBe(1234.57);
  });

  it("rejects a negative balance", async () => {
    expect(await updateSavings(fixture("full"), USER_ID, -1)).toEqual({
      ok: false,
      error: "Amounts can't be negative.",
    });
  });

  it("holds the salary to the income rules, and skips one that rounds to nothing", async () => {
    const store = fixture("new");
    expect(await completeOnboarding(store, USER_ID, 5000, -5)).toEqual({
      ok: false,
      error: "Amount must be greater than zero.",
    });

    expect((await completeOnboarding(store, USER_ID, 5000, 0.001)).ok).toBe(true);
    const sources = await store.incomeSources.list();
    expect(sources.ok && sources.value).toEqual([]);
  });

  it("finishes onboarding once; a replay succeeds with nothing to refresh", async () => {
    const store = fixture("new");
    const first = await completeOnboarding(store, USER_ID, 5000, 3000);
    expect(paths(first)).toEqual(["/dashboard", "/settings"]);

    const replay = await completeOnboarding(store, USER_ID, 5000, 3000);
    expect(replay).toEqual({ ok: true, refresh: [] });

    const sources = await store.incomeSources.list();
    expect(sources.ok && sources.value).toHaveLength(1);
  });
});
