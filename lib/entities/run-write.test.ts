import { describe, it, expect, vi, beforeEach } from "vitest";
import { today } from "@/lib/utils/calendar";
import { DEMO_READ_ONLY } from "./write";
import { createTransaction } from "./transaction";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  getSignedIn: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
// A request carrying only the demo cookie, and a Supabase that fails the
// test if anything asks it for a session.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "tally_demo" ? { name, value: "1" } : undefined),
    getAll: () => [{ name: "tally_demo", value: "1" }],
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  fixturesEnabled: () => false,
  getSignedIn: mocks.getSignedIn,
}));

import { runWrite } from "./run-write";

describe("runWrite as a demo visitor", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockClear();
    mocks.getSignedIn.mockReset();
  });

  it("answers a valid write with the demo message, and never reaches Supabase", async () => {
    const result = await runWrite((store, userId) =>
      createTransaction(store, userId, {
        amount: 12.5,
        category_id: "demo-cat-food",
        merchant: "Harbor Coffee Co",
        description: "",
        date: today(),
        recurrence: "once",
      })
    );

    expect(result).toEqual({ ok: false, error: DEMO_READ_ONLY });
    expect(mocks.getSignedIn).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("still validates first, so a bad expense gets its own message", async () => {
    const result = await runWrite((store, userId) =>
      createTransaction(store, userId, {
        amount: -5,
        category_id: "demo-cat-food",
        date: today(),
      })
    );

    expect(result.ok).toBe(false);
    expect(result).not.toEqual({ ok: false, error: DEMO_READ_ONLY });
  });
});
