import { describe, it, expect } from "vitest";
import { createMemoryStore, type MemoryData } from "@/lib/store/memory-store";
import { recurringMonthlyTotal } from "@/lib/utils/recurrence";
import { resumeRecurring, stopRecurring, updateTransaction } from "./transaction";
import type { Store } from "./write";

const USER = "00000000-0000-4000-8000-000000000001";

function seed(): { store: Store; data: MemoryData } {
  const preset = (id: string, name: string) => ({
    id, user_id: null, name, color: "#111111", icon: "tag", is_preset: true, created_at: "2020-01-01",
  });
  const tx = (id: string, date: string, over: Record<string, unknown> = {}) => ({
    id,
    user_id: USER,
    amount: 15,
    description: null,
    merchant: "Netflix",
    category_id: "cat-fun",
    date,
    recurrence: "monthly",
    created_at: `${date}T00:00:00Z`,
    ...over,
  });
  const data: MemoryData = {
    profile: { id: USER, savings_balance: 1000, onboarded: true },
    categories: [preset("cat-fun", "Fun"), preset("cat-other", "Other")],
    transactions: [tx("t1", "2026-09-01"), tx("t2", "2026-10-01"), tx("t3", "2026-11-01")],
    incomeSources: [],
  };
  return { store: createMemoryStore({ viewerId: USER, data }), data };
}

async function monthly(store: Store, asOf: string) {
  const rows = await store.transactions.listRecurring();
  if (!rows.ok) throw new Error("read failed");
  return recurringMonthlyTotal(rows.value, asOf);
}

const fields = (merchant: string | null) => ({
  amount: 15,
  category_id: "cat-fun",
  description: null,
  merchant,
  date: "2026-11-01",
  recurrence: "monthly",
});

describe("stopping a recurring expense", () => {
  it("stops it counting from that day and keeps every row", async () => {
    const { store } = seed();
    expect(await monthly(store, "2026-11-27")).toBe(15);

    const result = await stopRecurring(store, USER, "t3", "2026-11-27");
    expect(result.ok).toBe(true);

    expect(await monthly(store, "2026-11-26")).toBe(15);
    expect(await monthly(store, "2026-11-27")).toBe(0);
    const all = await store.transactions.listAll();
    expect(all.ok && all.value).toHaveLength(3);
  });

  it("counts again when resumed", async () => {
    const { store } = seed();
    await stopRecurring(store, USER, "t3", "2026-11-27");
    await resumeRecurring(store, USER, "t3");
    expect(await monthly(store, "2026-11-27")).toBe(15);
  });

  it("refuses a one-off, which has nothing to end", async () => {
    const { store, data } = seed();
    data.transactions[2].recurrence = "once";
    const result = await stopRecurring(store, USER, "t3", "2026-11-27");
    expect(result).toEqual({ ok: false, error: "That isn't a repeating expense any more." });
  });

  it("won't end a series before its last row", async () => {
    const { store } = seed();
    const result = await stopRecurring(store, USER, "t3", "2026-10-01");
    expect(result.ok).toBe(false);
  });
});

describe("editing the newest row of a series", () => {
  it("carries a merchant change back so the series is not counted twice", async () => {
    const { store } = seed();
    const result = await updateTransaction(store, USER, "t3", {
      ...fields("Netflix Premium"),
    });
    expect(result.ok).toBe(true);
    expect(await monthly(store, "2026-11-27")).toBe(15);
  });

  it("carries a category change back too", async () => {
    const { store } = seed();
    await updateTransaction(store, USER, "t3", { ...fields("Netflix"), category_id: "cat-other" });
    expect(await monthly(store, "2026-11-27")).toBe(15);
  });

  it("moves only that row when an older row is edited", async () => {
    const { store } = seed();
    await updateTransaction(store, USER, "t1", { ...fields("Hulu"), date: "2026-09-01" });
    // Netflix (t2, t3) and Hulu (t1) are now different commitments.
    expect(await monthly(store, "2026-11-27")).toBe(30);
  });

  it("leaves history alone when only the amount changes", async () => {
    const { store, data } = seed();
    await updateTransaction(store, USER, "t3", { ...fields("Netflix"), amount: 20 });
    expect(data.transactions.map((t) => t.amount)).toEqual([15, 15, 20]);
  });

  it("clears an end date when a repeating expense becomes a one-off", async () => {
    const { store, data } = seed();
    await stopRecurring(store, USER, "t3", "2026-11-27");
    const result = await updateTransaction(store, USER, "t3", { ...fields("Netflix"), recurrence: "once" });
    expect(result.ok).toBe(true);
    expect(data.transactions.every((t) => !t.ends_on)).toBe(true);
  });
});
