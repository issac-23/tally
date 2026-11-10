import { describe, it, expect } from "vitest";
import * as categories from "@/lib/entities/category";
import * as incomeSources from "@/lib/entities/income-source";
import * as profile from "@/lib/entities/profile";
import * as transactions from "@/lib/entities/transaction";
import { DEMO_READ_ONLY, failStore } from "@/lib/entities/write";
import type { Store } from "@/lib/store/types";
import { today } from "@/lib/utils/calendar";
import type { TransactionFields } from "@/lib/utils/transaction-input";
import { DEMO_USER_ID } from "./data";
import { createReadOnlyDemoStore } from "./read-only-store";

const READ_ONLY = { ok: false, error: { kind: "read-only" } };

const fields: TransactionFields = {
  amount: 12,
  description: null,
  merchant: "Harbor Coffee Co",
  category_id: "demo-cat-food",
  date: today(),
  recurrence: "once",
};

const expense = {
  amount: 12,
  description: "",
  merchant: "Harbor Coffee Co",
  category_id: "demo-cat-food",
  date: today(),
  recurrence: "once",
};

/** Every write the Store has, called with plausible arguments. */
function everyWrite(store: Store) {
  const u = DEMO_USER_ID;
  return {
    "profiles.setSavings": () => store.profiles.setSavings(u, 100),
    "profiles.markOnboarded": () => store.profiles.markOnboarded(u, 100),
    "profiles.createOnboarded": () => store.profiles.createOnboarded(u, 100),
    "incomeSources.add": () =>
      store.incomeSources.add(u, {
        name: "Side job",
        amount: 50,
        recurrence: "monthly",
        starts_on: null,
        ends_on: null,
      }),
    "incomeSources.remove": () => store.incomeSources.remove(u, "demo-inc-1"),
    "categories.add": () => store.categories.add(u, { name: "Travel", color: "#123456" }),
    "categories.remove": () => store.categories.remove(u, "demo-cat-books"),
    "transactions.add": () => store.transactions.add(u, fields),
    "transactions.update": () => store.transactions.update(u, "demo-tx-1", fields),
    "transactions.remove": () => store.transactions.remove(u, "demo-tx-1"),
  };
}

describe("createReadOnlyDemoStore", () => {
  it("serves the demo account", async () => {
    const store = createReadOnlyDemoStore();

    const profileResult = await store.profiles.get(DEMO_USER_ID);
    expect(profileResult).toMatchObject({ ok: true, value: { onboarded: true } });

    const all = await store.transactions.listAll();
    const income = await store.incomeSources.list();
    const visible = await store.categories.listVisible();
    const custom = await store.categories.listCustom(DEMO_USER_ID);
    if (!all.ok || !income.ok || !visible.ok || !custom.ok) throw new Error("read failed");

    expect(all.value.length).toBeGreaterThan(20);
    expect(income.value.length).toBeGreaterThanOrEqual(2);
    expect(visible.value.some((c) => c.is_preset)).toBe(true);
    expect(custom.value.length).toBeGreaterThanOrEqual(2);
  });

  it("refuses every write with read-only", async () => {
    const writes = everyWrite(createReadOnlyDemoStore());
    for (const [name, run] of Object.entries(writes)) {
      expect(await run(), name).toMatchObject(READ_ONLY);
    }
  });

  it("covers every write the Store has", () => {
    // If a write is added to the Store, it has to be added to everyWrite
    // too, or this count stops matching.
    const store = createReadOnlyDemoStore();
    const reads = new Set([
      "profiles.get",
      "incomeSources.list",
      "categories.listVisible",
      "categories.listCustom",
      "categories.find",
      "transactions.listAll",
      "transactions.listSince",
      "transactions.listRecurring",
      "transactions.listRecent",
      "transactions.get",
    ]);
    const all = Object.entries(store).flatMap(([group, methods]) =>
      Object.keys(methods).map((method) => `${group}.${method}`)
    );
    const writes = all.filter((name) => !reads.has(name)).sort();
    expect(writes).toEqual(Object.keys(everyWrite(store)).sort());
  });

  it("leaves the data as it was after a refused write", async () => {
    const store = createReadOnlyDemoStore();
    const before = await store.transactions.listAll();
    await store.transactions.remove(DEMO_USER_ID, "demo-tx-1");
    await store.transactions.add(DEMO_USER_ID, fields);
    expect(await store.transactions.listAll()).toEqual(before);
  });

  it("shares nothing between two stores", async () => {
    const a = createReadOnlyDemoStore();
    const b = createReadOnlyDemoStore();
    const first = await a.transactions.listAll();
    const second = await b.transactions.listAll();
    if (!first.ok || !second.ok) throw new Error("read failed");
    expect(second.value).toEqual(first.value);
    // Different objects, so a mutation of one result can't reach the other.
    expect(second.value[0]).not.toBe(first.value[0]);
    first.value[0].amount = -1;
    const third = await a.transactions.listAll();
    if (!third.ok) throw new Error("read failed");
    expect(third.value[0].amount).not.toBe(-1);
  });
});

describe("the entity writes against the demo store", () => {
  const message = { ok: false, error: DEMO_READ_ONLY };

  it("says the demo message for each entity", async () => {
    const store = createReadOnlyDemoStore();
    const u = DEMO_USER_ID;

    expect(await profile.updateSavings(store, u, 500)).toEqual(message);
    expect(await profile.completeOnboarding(store, u, 500, 3000)).toEqual(message);
    expect(
      await incomeSources.createIncomeSource(store, u, {
        name: "Side job",
        amount: 50,
        recurrence: "monthly",
      })
    ).toEqual(message);
    expect(await incomeSources.deleteIncomeSource(store, u, "demo-inc-1")).toEqual(message);
    expect(await categories.createCategory(store, u, "Travel", "#123456")).toEqual(message);
    expect(await categories.deleteCategory(store, u, "demo-cat-books")).toEqual(message);
    expect(await transactions.createTransaction(store, u, expense)).toEqual(message);
    expect(await transactions.updateTransaction(store, u, "demo-tx-1", expense)).toEqual(message);
    expect(await transactions.deleteTransaction(store, u, "demo-tx-1")).toEqual(message);
  });

  it("is a message to show, not a failure to log", () => {
    expect(DEMO_READ_ONLY).toBe("This is a demo, so changes aren't saved.");
    expect(failStore("act", { kind: "read-only" })).toEqual(message);
  });
});
