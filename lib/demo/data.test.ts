import { describe, it, expect } from "vitest";
import { createMemoryStore } from "@/lib/store/memory-store";
import { loadFinancialPicture } from "@/lib/finance/financial-picture";
import { addDays, dayKey, daysAgo, today } from "@/lib/utils/calendar";
import { buildDemoData, DEMO_USER_ID } from "./data";

// Far enough apart to cross a year end and a leap day.
const CLOCKS = [
  new Date(2026, 10, 9, 12),
  new Date(2027, 0, 3, 12),
  new Date(2028, 1, 29, 12),
  new Date(2031, 6, 15, 12),
];

function storeAt(now: Date) {
  return createMemoryStore({ viewerId: DEMO_USER_ID, data: buildDemoData(now) });
}

describe("buildDemoData", () => {
  it("uses an id no signed-in user can have", () => {
    expect(DEMO_USER_ID).toMatch(/^00000000-0000-4000-8000-0{7}/);
  });

  it("is an onboarded account with a balance", () => {
    const { profile } = buildDemoData();
    expect(profile).toMatchObject({ id: DEMO_USER_ID, onboarded: true });
    expect(profile!.savings_balance).toBeGreaterThan(0);
  });

  it.each(CLOCKS)("populates the 30 and 60 day windows when the date is %s", async (now) => {
    const store = storeAt(now);
    const last30 = await store.transactions.listSince(daysAgo(now, 30));
    const last60 = await store.transactions.listSince(daysAgo(now, 60));
    if (!last30.ok || !last60.ok) throw new Error("read failed");

    expect(last30.value.length).toBeGreaterThan(10);
    // The comparison needs a prior period with spending in it.
    const prior = last60.value.length - last30.value.length;
    expect(prior).toBeGreaterThan(10);
  });

  it.each(CLOCKS)("never dates anything in the future when the date is %s", (now) => {
    const { transactions } = buildDemoData(now);
    const latest = transactions.map((t) => t.date).sort().at(-1)!;
    expect(latest <= today(now)).toBe(true);
    // Every date is a real day key.
    for (const t of transactions) expect(t.date).toBe(dayKey(new Date(`${t.date}T12:00:00`)));
  });

  it.each(CLOCKS)("keeps an income source ending after today when the date is %s", (now) => {
    const { incomeSources } = buildDemoData(now);
    const ending = incomeSources.find((s) => s.ends_on);
    expect(ending).toBeDefined();
    expect(ending!.ends_on! > addDays(today(now), 60)).toBe(true);
  });

  it.each(CLOCKS)("gives a ready financial picture when the date is %s", async (now) => {
    const result = await loadFinancialPicture(storeAt(now), DEMO_USER_ID, now);
    if (result.status !== "ready") throw new Error(`expected ready, got ${result.status}`);

    const { picture } = result;
    expect(picture.hasSpendingData).toBe(true);
    expect(picture.monthlyIncome).toBeGreaterThan(0);
    expect(picture.burnRate).toBeGreaterThan(0);
    expect(picture.spending.this_month).toBeGreaterThan(0);
    expect(picture.commitments).toBeDefined();
    expect(picture.recent).toHaveLength(5);
    // The freelance income stops partway through the year.
    const schedule = picture.incomeSchedule;
    expect(schedule[0]).toBeGreaterThan(schedule[schedule.length - 1]);
  });

  it("has preset and custom categories, and a commitment older than the window", async () => {
    const now = new Date(2026, 10, 9, 12);
    const store = storeAt(now);
    const categories = await store.categories.listVisible();
    const recurring = await store.transactions.listRecurring();
    if (!categories.ok || !recurring.ok) throw new Error("read failed");

    expect(categories.value.some((c) => c.is_preset)).toBe(true);
    expect(categories.value.filter((c) => !c.is_preset).length).toBeGreaterThanOrEqual(2);
    expect(recurring.value.some((t) => t.date < daysAgo(now, 90))).toBe(true);
  });

  it("builds separate data on every call", () => {
    const first = buildDemoData();
    first.transactions.length = 0;
    expect(buildDemoData().transactions.length).toBeGreaterThan(0);
  });
});
