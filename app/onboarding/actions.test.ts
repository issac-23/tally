import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFixtureClient, resetFixtureStores } from "@/lib/dev/fixtures";
import { GENERIC_ERROR } from "@/lib/utils/errors";

const state = vi.hoisted(() => ({ scenario: "new" }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => createFixtureClient({ scenario: state.scenario }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// The real redirect throws to unwind the action; so does this one.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
}));

import { completeOnboarding } from "./actions";

async function salaries(): Promise<number> {
  const supabase = createFixtureClient({ scenario: state.scenario });
  const { data } = await supabase.from("income_sources").select("*");
  return (data as Array<{ name: string }>).filter((row) => row.name === "Salary").length;
}

describe("completeOnboarding", () => {
  beforeEach(() => {
    resetFixtureStores();
    state.scenario = "new";
  });

  it("adds the salary once, and a replay adds nothing", async () => {
    await expect(completeOnboarding(5000, 3000)).rejects.toThrow("REDIRECT /dashboard");
    expect(await salaries()).toBe(1);

    await expect(completeOnboarding(5000, 3000)).rejects.toThrow("REDIRECT /dashboard");
    expect(await salaries()).toBe(1);
  });

  it("adds the salary once when two calls run at the same time", async () => {
    const results = await Promise.allSettled([
      completeOnboarding(5000, 3000),
      completeOnboarding(5000, 3000),
    ]);
    // Both end at the dashboard; only the call that flipped `onboarded`
    // gets to add the income source.
    for (const result of results) {
      expect(result.status).toBe("rejected");
      expect((result as PromiseRejectedResult).reason.message).toBe("REDIRECT /dashboard");
    }
    expect(await salaries()).toBe(1);
  });

  it("rounds to cents before checking the cap", async () => {
    expect((await completeOnboarding(5000, 9_999_999_999.999)).error).toMatch(/or less/);
    expect((await completeOnboarding(9_999_999_999.999, 0)).error).toMatch(/or less/);
    expect(await salaries()).toBe(0);

    // 9_999_999_999.994 rounds down to the cap, so it's allowed.
    await expect(completeOnboarding(5000, 9_999_999_999.994)).rejects.toThrow(
      "REDIRECT /dashboard"
    );
    expect(await salaries()).toBe(1);
  });

  it("hides the database's own error message", async () => {
    state.scenario = "error";
    // "error" is already onboarded; flip it so the write is attempted.
    const supabase = createFixtureClient({ scenario: state.scenario });
    const { data } = await supabase.from("profiles").select("*").maybeSingle();
    (data as { onboarded: boolean }).onboarded = false;

    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await completeOnboarding(5000, 3000);
    expect(result.error).toBe(GENERIC_ERROR);
    expect(result.error).not.toMatch(/fixture/i);
  });
});
