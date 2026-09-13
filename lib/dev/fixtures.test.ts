import { describe, it, expect, beforeEach } from "vitest";
import {
  SCENARIOS,
  baseScenario,
  createFixtureClient,
  resetFixtureStores,
} from "./fixtures";

/**
 * These guard the fixture layer against the two ways it has actually broken:
 * silently answering a query it doesn't implement, and losing its in-memory
 * state part-way through a flow.
 */
describe("baseScenario", () => {
  it("accepts every scenario it advertises", () => {
    for (const scenario of SCENARIOS) {
      expect(baseScenario(scenario)).toBe(scenario);
    }
  });

  it("strips a nonce suffix", () => {
    expect(baseScenario("critical:run-17")).toBe("critical");
  });

  it("falls back to full for anything unrecognised", () => {
    expect(baseScenario("nonsense")).toBe("full");
    expect(baseScenario("")).toBe("full");
  });
});

describe("createFixtureClient", () => {
  beforeEach(resetFixtureStores);

  it("returns a signed-in user by default", async () => {
    const supabase = createFixtureClient({ scenario: "full" });
    const { data } = await supabase.auth.getUser();
    expect(data.user?.id).toBeTruthy();
  });

  it("returns no user for the signedout scenario", async () => {
    const supabase = createFixtureClient({ scenario: "signedout" });
    const { data } = await supabase.auth.getUser();
    expect(data.user).toBeNull();
  });

  it("keeps scenarios isolated from each other", async () => {
    const empty = createFixtureClient({ scenario: "empty" });
    const full = createFixtureClient({ scenario: "full" });

    const { data: emptyRows } = await empty.from("transactions").select("id");
    const { data: fullRows } = await full.from("transactions").select("id");

    expect((emptyRows as unknown[]).length).toBe(0);
    expect((fullRows as unknown[]).length).toBeGreaterThan(0);
  });

  it("persists a write across clients sharing a scenario key", async () => {
    const first = createFixtureClient({ scenario: "empty" });
    await first.from("transactions").insert({
      amount: 12.5,
      date: "2026-08-01",
      category_id: "cat-food",
      recurrence: "once",
    });

    // A later request builds a fresh client but must see the same store,
    // otherwise a completed action looks like it never happened.
    const second = createFixtureClient({ scenario: "empty" });
    const { data } = await second.from("transactions").select("id, amount");
    expect((data as Array<{ amount: number }>).map((r) => r.amount)).toEqual([12.5]);
  });

  it("gives a nonce its own store", async () => {
    const a = createFixtureClient({ scenario: "empty:run-a" });
    await a.from("transactions").insert({
      amount: 5,
      date: "2026-08-01",
      category_id: null,
      recurrence: "once",
    });

    const b = createFixtureClient({ scenario: "empty:run-b" });
    const { data } = await b.from("transactions").select("id");
    expect((data as unknown[]).length).toBe(0);
  });

  it("reproduces the duplicate-category constraint", async () => {
    const supabase = createFixtureClient({ scenario: "empty" });
    const insert = () =>
      supabase.from("categories").insert({ name: "Coffee", color: "#000000", icon: "tag" });

    const first = await insert();
    expect(first.error).toBeNull();

    const second = await insert();
    expect((second.error as { code: string }).code).toBe("23505");
  });

  it("fails writes in the error scenario but still reads", async () => {
    const supabase = createFixtureClient({ scenario: "error" });

    const { error: writeError } = await supabase
      .from("profiles")
      .update({ savings_balance: 1 })
      .eq("id", "x");
    expect(writeError).toBeTruthy();

    const { error: readError } = await supabase.from("transactions").select("id");
    expect(readError).toBeNull();
  });

  it("survives being awaited", async () => {
    // createClient is async, so `await createClient()` probes the returned
    // object for `.then`. The guard used to throw on that and broke every
    // request in fixture mode.
    const supabase = await (async () => createFixtureClient({ scenario: "full" }))();
    const { data } = await supabase.auth.getUser();
    expect(data.user?.email).toBe("fixture@tally.dev");
  });

  it("survives being awaited through a promise chain", async () => {
    const supabase = await Promise.resolve(createFixtureClient({ scenario: "full" }));
    expect(typeof supabase.from).toBe("function");
  });

  it("throws on a query method it does not implement", () => {
    const supabase = createFixtureClient({ scenario: "full" });
    // `ilike` is real Supabase API the stub has no answer for. Returning an
    // empty result here would render a plausible, wrong empty state.
    expect(() =>
      (supabase.from("transactions") as unknown as { ilike: () => void }).ilike()
    ).toThrow(/not implemented/i);
  });

  it("throws on an unknown table rather than reporting no rows", async () => {
    const supabase = createFixtureClient({ scenario: "full" });
    await expect(supabase.from("budgets").select("id")).rejects.toThrow(
      /no fixture data for table/i
    );
  });

  it("throws on an unknown top-level client property", () => {
    const supabase = createFixtureClient({ scenario: "full" });
    expect(
      () => (supabase as unknown as { storage: unknown }).storage
    ).toThrow(/not implemented/i);
  });
});
