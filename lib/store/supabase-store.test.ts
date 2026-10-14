import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseStore, toStoreError } from "./supabase-store";

/**
 * A client whose every query, however it is chained, resolves to `result`
 * and records the table and filters it was given.
 */
function answering(result: { data?: unknown; error?: unknown }) {
  const calls: string[] = [];
  const chain: unknown = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") {
          return (resolve: (value: unknown) => void) =>
            resolve({ data: null, error: null, ...result });
        }
        return (...args: unknown[]) => {
          calls.push(`${String(property)}(${args.map((a) => JSON.stringify(a)).join(", ")})`);
          return chain;
        };
      },
    }
  );
  const client = { from: (table: string) => (calls.push(`from(${table})`), chain) };
  return { client: client as unknown as SupabaseClient, calls };
}

const rowCap = { code: "23514", message: "row limit reached: categories allows 100 rows per user" };
const notYours = { code: "23514", message: "category is not available to this user" };
const lengthCheck = {
  code: "23514",
  message: 'new row violates check constraint "transactions_merchant_length"',
};

describe("toStoreError", () => {
  it("names the rejections the app can explain", () => {
    expect(toStoreError({ code: "23505" })).toEqual({ kind: "duplicate" });
    expect(toStoreError(rowCap)).toEqual({ kind: "row-limit" });
    expect(toStoreError(notYours)).toEqual({ kind: "category-unavailable" });
  });

  it("keeps everything else as a failure with its cause", () => {
    expect(toStoreError(lengthCheck)).toEqual({ kind: "failed", cause: lengthCheck });
    expect(toStoreError({ code: "42501", message: "rls" }).kind).toBe("failed");
  });
});

describe("the Supabase store", () => {
  it("narrows a joined category whether PostgREST wraps it or not", async () => {
    const category = { id: "c1", name: "Food", icon: "utensils", color: "#fff" };
    const row = (joined: unknown) => ({
      id: "t1",
      amount: "12.50",
      description: null,
      merchant: "Cafe",
      date: "2026-05-15",
      recurrence: "once",
      category_id: "c1",
      category: joined,
    });
    const { client } = answering({ data: [row(category), row([category]), row(null)] });

    const result = await createSupabaseStore(client).transactions.listAll();
    if (!result.ok) throw new Error("expected rows");
    expect(result.value.map((t) => t.category)).toEqual([category, category, null]);
    expect(result.value[0].amount).toBe(12.5);
  });

  it("returns a failed read as an error instead of no rows", async () => {
    const { client } = answering({ error: { code: "PGRST301", message: "JWT expired" } });
    const result = await createSupabaseStore(client).incomeSources.list();
    expect(result).toEqual({
      ok: false,
      error: { kind: "failed", cause: { code: "PGRST301", message: "JWT expired" } },
    });
  });

  it("maps a write's rejection to the store's error", async () => {
    const { client } = answering({ error: rowCap });
    const result = await createSupabaseStore(client).categories.add("u1", {
      name: "Pets",
      color: "#112233",
    });
    expect(result).toEqual({ ok: false, error: { kind: "row-limit" } });
  });

  it("tells an update that matched nothing from one that did", async () => {
    const fields = {
      amount: 1,
      category_id: "c1",
      description: null,
      merchant: null,
      date: "2026-05-15",
      recurrence: "once" as const,
    };
    const none = answering({ data: [] });
    expect(await createSupabaseStore(none.client).transactions.update("u1", "t1", fields)).toEqual({
      ok: true,
      value: false,
    });
    const one = answering({ data: [{ id: "t1" }] });
    expect(await createSupabaseStore(one.client).transactions.update("u1", "t1", fields)).toEqual({
      ok: true,
      value: true,
    });
  });

  it("scopes a delete to the user and, for categories, to custom ones", async () => {
    const { client, calls } = answering({});
    await createSupabaseStore(client).categories.remove("u1", "c1");
    expect(calls).toEqual([
      "from(categories)",
      "delete()",
      'eq("id", "c1")',
      'eq("user_id", "u1")',
      'eq("is_preset", false)',
    ]);
  });
});
