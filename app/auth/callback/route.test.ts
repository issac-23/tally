import { describe, it, expect, vi, beforeEach } from "vitest";

const supabase = vi.hoisted(() => ({
  exchange: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: supabase.exchange },
  }),
}));

import { GET } from "./route";

describe("auth callback", () => {
  beforeEach(() => {
    supabase.exchange.mockReset();
  });

  it("clears the demo cookie after a successful sign-in", async () => {
    supabase.exchange.mockResolvedValue({ error: null });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    const cleared = response.headers.get("set-cookie") ?? "";
    expect(cleared).toMatch(/tally_demo=;/);
    expect(cleared).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
  });

  it("leaves the demo cookie alone when sign-in fails", async () => {
    supabase.exchange.mockResolvedValue({ error: new Error("bad code") });

    const response = await GET(new Request("http://localhost:3000/auth/callback?code=abc"));

    expect(new URL(response.headers.get("location")!).search).toBe("?error=auth_failed");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
