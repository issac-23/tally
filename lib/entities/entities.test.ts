import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFixtureClient, resetFixtureStores } from "@/lib/dev/fixtures";
import { CATEGORY_UNAVAILABLE_MESSAGE } from "@/lib/supabase/categories";
import { GENERIC_ERROR } from "@/lib/utils/errors";
import { createTransaction, deleteTransaction, updateTransaction } from "./transaction";
import { createIncomeSource, deleteIncomeSource } from "./income-source";
import { createCategory, deleteCategory } from "./category";
import { completeOnboarding, updateSavings } from "./profile";
import type { Client, WriteResult } from "./write";

const USER_ID = "00000000-0000-4000-8000-000000000001";

// The fixture client stands in for the Supabase client, so it is handed over
// as `never`, the way lib/supabase/server.ts does.
function fixture(scenario = "full"): Client {
  return createFixtureClient({ scenario }) as never;
}

/**
 * A client whose writes all come back with `error` and whose reads find a
 * preset category: how Postgres answers when a trigger or constraint
 * rejects a row, which the fixture doesn't model.
 */
function rejecting(error: { code: string; message: string }): Client {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({
      data: { id: "cat-food", user_id: null, is_preset: true },
      error: null,
    }),
    insert: async () => ({ error }),
  };
  return { from: () => query } as never;
}

const rowCap = (table: string, cap: number) => ({
  code: "23514",
  message: `row limit reached: ${table} allows ${cap} rows per user`,
});

function paths(result: WriteResult): string[] {
  return result.ok ? result.refresh.map((r) => r.path) : [];
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
    const client = fixture("empty");
    const result = await createTransaction(client, USER_ID, expense);
    expect(paths(result)).toEqual(["/dashboard", "/transactions"]);

    const { data } = await client.from("transactions").select("*");
    expect(data).toHaveLength(1);
  });

  it("says why before touching the database", async () => {
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

  it("maps the row cap and the ownership trigger to their own messages", async () => {
    const capped = await createTransaction(
      rejecting(rowCap("transactions", 10000)),
      USER_ID,
      expense
    );
    expect(capped).toEqual({
      ok: false,
      error: "You've reached the limit of 10,000 expenses.",
    });

    const raced = await createTransaction(
      rejecting({ code: "23514", message: "category is not available to this user" }),
      USER_ID,
      expense
    );
    expect(raced).toEqual({ ok: false, error: CATEGORY_UNAVAILABLE_MESSAGE });
  });

  it("hides a database failure behind the generic message", async () => {
    const result = await createTransaction(fixture("error"), USER_ID, expense);
    expect(result).toEqual({ ok: false, error: GENERIC_ERROR });
  });

  it("edits an expense, and also refreshes its edit page", async () => {
    const client = fixture("full");
    const { data } = await client.from("transactions").select("id").limit(1);
    const id = (data as Array<{ id: string }>)[0].id;

    const result = await updateTransaction(client, USER_ID, id, { ...expense, amount: 99 });
    expect(paths(result)).toEqual(["/dashboard", "/transactions", "/transactions/[id]/edit"]);
    expect(result.ok && result.refresh[2].type).toBe("page");

    const row = await client.from("transactions").select("amount").eq("id", id).maybeSingle();
    expect((row.data as { amount: number }).amount).toBe(99);
  });

  it("reports an edit to an expense that's gone", async () => {
    const result = await updateTransaction(fixture("full"), USER_ID, "fx-tx-nope", expense);
    expect(result).toEqual({ ok: false, error: "That expense no longer exists." });
  });

  it("deletes an expense", async () => {
    const client = fixture("full");
    const { data } = await client.from("transactions").select("id").limit(1);
    const id = (data as Array<{ id: string }>)[0].id;

    const result = await deleteTransaction(client, USER_ID, id);
    expect(result.ok).toBe(true);
    const after = await client.from("transactions").select("id").eq("id", id);
    expect(after.data).toEqual([]);
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
    const client = fixture("empty");
    const created = await createIncomeSource(client, USER_ID, input);
    expect(paths(created)).toEqual(["/dashboard", "/settings"]);

    const { data } = await client.from("income_sources").select("id, name");
    const added = (data as Array<{ id: string; name: string }>).find((s) => s.name === "Retainer");
    expect(added).toBeDefined();

    const deleted = await deleteIncomeSource(client, USER_ID, added!.id);
    expect(paths(deleted)).toEqual(["/dashboard", "/settings"]);
  });

  it("rejects what the validator rejects", async () => {
    const result = await createIncomeSource(fixture("empty"), USER_ID, { ...input, name: " " });
    expect(result).toEqual({ ok: false, error: "Give it a name." });
  });

  it("maps the row cap to a message naming the limit", async () => {
    const result = await createIncomeSource(
      rejecting(rowCap("income_sources", 50)),
      USER_ID,
      input
    );
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

  it("explains a duplicate name", async () => {
    const client = fixture("empty");
    await createCategory(client, USER_ID, "Pets", "#112233");
    expect(await createCategory(client, USER_ID, "Pets", "#112233")).toEqual({
      ok: false,
      error: "You already have a category with that name.",
    });
  });

  it("validates the name and the colour", async () => {
    const client = fixture("empty");
    expect((await createCategory(client, USER_ID, "a", "#112233")).ok).toBe(false);
    expect(await createCategory(client, USER_ID, "x".repeat(33), "#112233")).toEqual({
      ok: false,
      error: "Category name must be 32 characters or fewer.",
    });
    expect(await createCategory(client, USER_ID, "Pets", "red")).toEqual({
      ok: false,
      error: "Choose a valid category color.",
    });
  });

  it("maps the row cap to a message naming the limit", async () => {
    const result = await createCategory(
      rejecting(rowCap("categories", 100)),
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
    const client = fixture("full");
    const result = await updateSavings(client, USER_ID, 1234.567);
    expect(paths(result)).toEqual(["/dashboard", "/settings"]);

    const { data } = await client.from("profiles").select("savings_balance").maybeSingle();
    expect((data as { savings_balance: number }).savings_balance).toBe(1234.57);
  });

  it("rejects a negative balance", async () => {
    expect(await updateSavings(fixture("full"), USER_ID, -1)).toEqual({
      ok: false,
      error: "Amounts can't be negative.",
    });
  });

  it("finishes onboarding once; a replay succeeds with nothing to refresh", async () => {
    const client = fixture("new");
    const first = await completeOnboarding(client, USER_ID, 5000, 3000);
    expect(paths(first)).toEqual(["/dashboard", "/settings"]);

    const replay = await completeOnboarding(client, USER_ID, 5000, 3000);
    expect(replay).toEqual({ ok: true, refresh: [] });

    const { data } = await client.from("income_sources").select("name");
    expect(data).toHaveLength(1);
  });
});
