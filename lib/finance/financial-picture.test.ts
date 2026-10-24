import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFixtureStore, resetFixtureStores } from "@/lib/dev/fixtures";
import type { Store } from "@/lib/store/types";
import { loadFinancialPicture, type FinancialPicture } from "./financial-picture";

const USER_ID = "00000000-0000-4000-8000-000000000001";

async function load(scenario: string, now?: Date) {
  return loadFinancialPicture(createFixtureStore({ scenario }), USER_ID, now);
}

async function ready(scenario: string, now?: Date): Promise<FinancialPicture> {
  const result = await load(scenario, now);
  if (result.status !== "ready") throw new Error(`expected ready, got ${result.status}`);
  return result.picture;
}

describe("loadFinancialPicture", () => {
  beforeEach(() => {
    resetFixtureStores();
  });

  it("loads a healthy account", async () => {
    const picture = await ready("full");
    expect(picture.savings).toBe(18400);
    expect(picture.monthlyIncome).toBe(4200);
    expect(picture.hasSpendingData).toBe(true);
    expect(picture.recent).toHaveLength(5);
    expect(picture.recent[0].category).not.toBeNull();
    expect(picture.categorySlices.length).toBeGreaterThan(0);
    expect(picture.merchantSlices.length).toBeGreaterThan(0);
    expect(picture.incomeSchedule).toHaveLength(13);
    expect(picture.spending.this_month).toBeGreaterThan(0);
  });

  it("sends someone who hasn't onboarded to onboarding", async () => {
    expect((await load("new")).status).toBe("needs-onboarding");
  });

  it("reports an onboarded account with nothing logged as having no spending data", async () => {
    const picture = await ready("empty");
    expect(picture.hasSpendingData).toBe(false);
    expect(picture.burnRate).toBe(0);
    expect(picture.recent).toEqual([]);
    expect(picture.spending).toEqual({ today: 0, this_week: 0, this_month: 0 });
  });

  it("turns failed reads into an unavailable state instead of zeros", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // The profile read fails too. That must not look like a missing profile
    // and send an onboarded user back to onboarding.
    expect((await load("unreadable")).status).toBe("unavailable");
  });

  it("is unavailable when a read after the profile fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const healthy = createFixtureStore({ scenario: "full" });
    const broken = createFixtureStore({ scenario: "unreadable" });
    // Everything reads fine except the income sources, the way a partial
    // outage would look.
    const store: Store = { ...healthy, incomeSources: broken.incomeSources };
    const result = await loadFinancialPicture(store, USER_ID);
    expect(result.status).toBe("unavailable");
  });

  it("counts standing commitments however long ago they were logged", async () => {
    const picture = await ready("recurring");
    const labels = picture.commitments.commitments.map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["Greystar Rent", "Geico", "Netflix"]));
    // Rent logged six months running is still one commitment.
    expect(labels.filter((l) => l === "Greystar Rent")).toHaveLength(1);
    expect(picture.burnRate).toBeGreaterThanOrEqual(picture.commitments.total);
  });

  it("cuts every window from the `now` it is given", async () => {
    const later = new Date();
    later.setDate(later.getDate() + 400);
    const picture = await ready("recurring", later);
    // Everything one-off has aged out of the 60-day read...
    expect(picture.spending).toEqual({ today: 0, this_week: 0, this_month: 0 });
    expect(picture.categorySlices).toEqual([]);
    expect(picture.periodComparison.current).toBe(0);
    // ...while standing commitments, which have no window, still count.
    expect(picture.burnRate).toBe(picture.commitments.total);
    expect(picture.hasSpendingData).toBe(true);
  });

  it("reads the same 30 days for the tiles, the breakdowns and the burn rate", async () => {
    const picture = await ready("critical");
    const sliced = picture.categorySlices.reduce((sum, s) => sum + s.amount, 0);
    expect(sliced).toBeCloseTo(picture.spending.this_month, 2);
    const merchants = picture.merchantSlices.reduce((sum, s) => sum + s.amount, 0);
    expect(merchants).toBeCloseTo(picture.spending.this_month, 2);
    expect(picture.burnRate).toBeCloseTo(picture.spending.this_month, 2);
    expect(picture.runway.status).toBe("red");
  });

  it("shows income that stops partway through as a lower later schedule", async () => {
    const picture = await ready("contractending");
    expect(picture.incomeSchedule[0]).toBe(4400);
    expect(picture.incomeSchedule[12]).toBe(1800);
  });
});
