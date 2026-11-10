import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

import { signOutAndLeave, SIGN_OUT_DESTINATION } from "./sign-out-button";

describe("signOutAndLeave", () => {
  it("signs out, then goes through the route that clears the demo cookie", async () => {
    const order: string[] = [];
    await signOutAndLeave(
      async () => void order.push("signOut"),
      (path) => void order.push(path)
    );
    expect(SIGN_OUT_DESTINATION).toBe("/demo/exit");
    expect(order).toEqual(["signOut", "/demo/exit"]);
  });

  it("does not navigate if signing out throws", async () => {
    const navigate = vi.fn();
    await expect(
      signOutAndLeave(async () => { throw new Error("offline"); }, navigate)
    ).rejects.toThrow("offline");
    expect(navigate).not.toHaveBeenCalled();
  });
});
