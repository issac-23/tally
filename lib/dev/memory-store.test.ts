import { describe, it, expect } from "vitest";
import {
  MAX_AMOUNT,
  MAX_CATEGORIES,
  MAX_INCOME_SOURCES,
  MAX_TRANSACTIONS,
} from "@/lib/utils/limits";
import { createMemoryStore, type MemoryData, type MemoryOptions } from "./memory-store";

const ME = "user-me";
const OTHER = "user-other";

function emptyData(): MemoryData {
  return {
    profile: { id: ME, savings_balance: 100, onboarded: false },
    categories: [
      { id: "preset", user_id: null, name: "Food", color: "#111111", icon: "utensils", is_preset: true, created_at: "2026-01-01" },
      { id: "mine", user_id: ME, name: "Books", color: "#222222", icon: "tag", is_preset: false, created_at: "2026-01-02" },
      { id: "theirs", user_id: OTHER, name: "Secret", color: "#333333", icon: "tag", is_preset: false, created_at: "2026-01-03" },
    ],
    transactions: [],
    incomeSources: [],
  };
}

function setup(extra: Partial<MemoryOptions> = {}) {
  const data = emptyData();
  const store = createMemoryStore({ viewerId: ME, data, ...extra });
  return { data, store };
}

const expense = (over: Record<string, unknown> = {}) => ({
  amount: 10,
  category_id: "preset",
  description: null,
  merchant: null,
  date: "2026-05-15",
  recurrence: "once" as const,
  ...over,
});

describe("categories", () => {
  it("compares names exactly, like the unique index, not case-insensitively", async () => {
    const { store } = setup();
    expect((await store.categories.add(ME, { name: "Pets", color: "#112233" })).ok).toBe(true);
    expect((await store.categories.add(ME, { name: "pets", color: "#112233" })).ok).toBe(true);
    expect(await store.categories.add(ME, { name: "Pets", color: "#112233" })).toEqual({
      ok: false,
      error: { kind: "duplicate" },
    });
  });

  it("lets two users share a name", async () => {
    const { store } = setup();
    // "Secret" belongs to someone else; the same name is free for me.
    expect((await store.categories.add(ME, { name: "Secret", color: "#112233" })).ok).toBe(true);
  });

  it("hides other users' categories and lists presets first", async () => {
    const { store } = setup();
    const visible = await store.categories.listVisible();
    expect(visible.ok && visible.value.map((c) => c.id)).toEqual(["preset", "mine"]);
    expect(await store.categories.find("theirs")).toEqual({ ok: true, value: null });
  });

  it("deletes only the user's own custom categories, and uncategorises their expenses", async () => {
    const { store, data } = setup();
    await store.transactions.add(ME, expense({ category_id: "mine" }));

    await store.categories.remove(ME, "preset");
    await store.categories.remove(ME, "theirs");
    expect(data.categories.map((c) => c.id)).toEqual(["preset", "mine", "theirs"]);

    await store.categories.remove(ME, "mine");
    expect(data.categories.map((c) => c.id)).toEqual(["preset", "theirs"]);
    expect(data.transactions[0].category_id).toBeNull();
  });

  it("stops at the per-user cap", async () => {
    const { store, data } = setup();
    for (let i = 0; i < MAX_CATEGORIES - 1; i++) {
      data.categories.push({ ...data.categories[1], id: `c${i}`, name: `Cat ${i}` });
    }
    expect(data.categories.filter((c) => c.user_id === ME)).toHaveLength(MAX_CATEGORIES);
    expect(await store.categories.add(ME, { name: "One too many", color: "#112233" })).toEqual({
      ok: false,
      error: { kind: "row-limit" },
    });
  });
});

describe("transactions", () => {
  it("refuses a category the writer may not use, on insert and when it changes", async () => {
    const { store, data } = setup();
    expect(await store.transactions.add(ME, expense({ category_id: "theirs" }))).toEqual({
      ok: false,
      error: { kind: "category-unavailable" },
    });
    expect(await store.transactions.add(ME, expense({ category_id: "nope" }))).toEqual({
      ok: false,
      error: { kind: "category-unavailable" },
    });
    // No category at all is fine.
    expect((await store.transactions.add(ME, expense({ category_id: null }))).ok).toBe(true);

    const id = data.transactions[0].id;
    expect(await store.transactions.update(ME, id, expense({ category_id: "theirs" }))).toEqual({
      ok: false,
      error: { kind: "category-unavailable" },
    });
    expect(await store.transactions.update(ME, id, expense({ category_id: "mine" }))).toEqual({
      ok: true,
      value: true,
    });
  });

  it("enforces the CHECK constraints as a failure, not a user message", async () => {
    const { store } = setup();
    for (const bad of [
      expense({ amount: 0 }),
      expense({ amount: MAX_AMOUNT + 1 }),
      expense({ description: "x".repeat(201) }),
      expense({ merchant: "x".repeat(101) }),
    ]) {
      const result = await store.transactions.add(ME, bad);
      expect(!result.ok && result.error.kind).toBe("failed");
    }
  });

  it("stops at the per-user cap", async () => {
    const { store, data } = setup();
    const template = { ...expense(), id: "", user_id: ME, category_id: null, created_at: "2026-01-01" };
    for (let i = 0; i < MAX_TRANSACTIONS; i++) data.transactions.push({ ...template, id: `t${i}` });
    expect(await store.transactions.add(ME, expense())).toEqual({
      ok: false,
      error: { kind: "row-limit" },
    });
  });

  it("reports an update to a missing row as not found, and a delete of one as fine", async () => {
    const { store } = setup();
    expect(await store.transactions.update(ME, "nope", expense())).toEqual({ ok: true, value: false });
    expect(await store.transactions.remove(ME, "nope")).toEqual({ ok: true, value: undefined });
    expect(await store.incomeSources.remove(ME, "nope")).toEqual({ ok: true, value: undefined });
  });

  it("lists newest first and joins the category", async () => {
    const { store } = setup();
    await store.transactions.add(ME, expense({ date: "2026-05-01", merchant: "old" }));
    await store.transactions.add(ME, expense({ date: "2026-05-10", merchant: "new" }));
    await store.transactions.add(ME, expense({ date: "2026-05-10", merchant: "newer", category_id: "mine" }));

    const all = await store.transactions.listAll();
    expect(all.ok && all.value.map((t) => t.merchant)).toEqual(["newer", "new", "old"]);
    expect(all.ok && all.value[0].category?.name).toBe("Books");

    const since = await store.transactions.listSince("2026-05-10");
    expect(since.ok && since.value).toHaveLength(2);
    const recent = await store.transactions.listRecent(1);
    expect(recent.ok && recent.value.map((t) => t.merchant)).toEqual(["newer"]);
  });
});

describe("income sources", () => {
  const source = { name: "Pay", amount: 10, recurrence: "monthly", starts_on: null, ends_on: null };

  it("enforces the cap before the CHECKs, like the trigger does", async () => {
    const { store, data } = setup();
    for (let i = 0; i < MAX_INCOME_SOURCES; i++) {
      data.incomeSources.push({ id: `i${i}`, user_id: ME, ...source, created_at: "2026-01-01" });
    }
    // Invalid *and* over the cap: the cap is what is reported.
    expect(await store.incomeSources.add(ME, { ...source, amount: -1 })).toEqual({
      ok: false,
      error: { kind: "row-limit" },
    });
  });

  it("rejects an end before a start and a recurrence income can't have", async () => {
    const { store } = setup();
    const ordered = await store.incomeSources.add(ME, { ...source, starts_on: "2026-06-01", ends_on: "2026-05-01" });
    expect(!ordered.ok && ordered.error.kind).toBe("failed");
    const daily = await store.incomeSources.add(ME, { ...source, recurrence: "daily" });
    expect(!daily.ok && daily.error.kind).toBe("failed");
  });
});

describe("profile", () => {
  it("flips onboarded once and reports who won", async () => {
    const { store } = setup();
    expect(await store.profiles.markOnboarded(ME, 500)).toEqual({ ok: true, value: true });
    expect(await store.profiles.markOnboarded(ME, 500)).toEqual({ ok: true, value: false });
    expect(await store.profiles.createOnboarded(ME, 500)).toEqual({
      ok: false,
      error: { kind: "duplicate" },
    });
  });

  it("creates a missing profile, and treats updating one that is missing as zero rows", async () => {
    const { store, data } = setup();
    data.profile = null;
    expect(await store.profiles.setSavings(ME, 5)).toEqual({ ok: true, value: undefined });
    expect(await store.profiles.markOnboarded(ME, 5)).toEqual({ ok: true, value: false });
    expect(await store.profiles.createOnboarded(ME, 5)).toEqual({ ok: true, value: undefined });
    expect(data.profile).toEqual({ id: ME, savings_balance: 5, onboarded: true });
  });

  it("holds the savings range", async () => {
    const { store } = setup();
    const negative = await store.profiles.setSavings(ME, -1);
    expect(!negative.ok && negative.error.kind).toBe("failed");
    const huge = await store.profiles.setSavings(ME, MAX_AMOUNT + 1);
    expect(!huge.ok && huge.error.kind).toBe("failed");
  });
});

describe("faults and scoping", () => {
  it("returns a failed read as an error, and a dropped connection as a throw", async () => {
    const failing = setup({ failReads: "error" }).store;
    const result = await failing.incomeSources.list();
    expect(!result.ok && result.error.kind).toBe("failed");

    const dropped = setup({ failReads: "throw" }).store;
    await expect(dropped.incomeSources.list()).rejects.toThrow(/simulated/);
  });

  it("fails every write when told to", async () => {
    const { store } = setup({ failWrites: true });
    const result = await store.transactions.add(ME, expense());
    expect(!result.ok && result.error.kind).toBe("failed");
  });

  it("refuses a write for someone other than the signed-in user", async () => {
    const { store, data } = setup();
    const result = await store.transactions.add(OTHER, expense());
    expect(!result.ok && result.error.kind).toBe("failed");
    expect(data.transactions).toEqual([]);
  });
});
