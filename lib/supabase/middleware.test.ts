import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const supabase = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  user: null as { id: string } | null,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabase.createServerClient,
}));

import { updateSession } from "./middleware";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function redirectedTo(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("updateSession", () => {
  beforeEach(() => {
    supabase.user = null;
    supabase.createServerClient.mockReset();
    supabase.createServerClient.mockImplementation(() => ({
      auth: { getUser: async () => ({ data: { user: supabase.user } }) },
    }));
  });

  it("turns a signed-out visitor away from a protected route", async () => {
    const response = await updateSession(request("/dashboard"));
    expect(redirectedTo(response)).toBe("/");
  });

  it("lets a demo visitor through without calling Supabase", async () => {
    for (const path of ["/dashboard", "/transactions", "/transactions/new", "/settings", "/onboarding"]) {
      const response = await updateSession(request(path, "tally_demo=1"));
      expect(redirectedTo(response), path).toBeNull();
    }
    expect(supabase.createServerClient).not.toHaveBeenCalled();
  });

  it("does not take another value for the demo cookie", async () => {
    const response = await updateSession(request("/dashboard", "tally_demo=yes"));
    expect(redirectedTo(response)).toBe("/");
  });

  it("still refreshes a real session when the demo cookie is there too", async () => {
    supabase.user = { id: "user-1" };
    const response = await updateSession(
      request("/dashboard", "tally_demo=1; sb-abcd-auth-token=x")
    );
    expect(supabase.createServerClient).toHaveBeenCalledTimes(1);
    expect(redirectedTo(response)).toBeNull();
  });

  it("falls back to the demo when the Supabase cookie holds no session", async () => {
    const response = await updateSession(
      request("/dashboard", "tally_demo=1; sb-abcd-auth-token=stale")
    );
    expect(supabase.createServerClient).toHaveBeenCalledTimes(1);
    expect(redirectedTo(response)).toBeNull();
  });

  it("leaves public routes alone", async () => {
    expect(redirectedTo(await updateSession(request("/")))).toBeNull();
    expect(redirectedTo(await updateSession(request("/demo")))).toBeNull();
  });
});
