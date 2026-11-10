import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Store } from "@/lib/store/types";
import { DEMO_COOKIE, DEMO_COOKIE_VALUE } from "@/lib/demo/cookie";
import { DEMO_USER_ID } from "@/lib/demo/data";

const jar = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
const supabase = vi.hoisted(() => ({
  fixtures: false,
  signedIn: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = jar.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll: () => [...jar.cookies].map(([name, value]) => ({ name, value })),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  fixturesEnabled: () => supabase.fixtures,
  getSignedIn: supabase.signedIn,
}));

import { resolveSession, resolveVisitor, type SessionDeps } from "./session";

const realStore = { marker: "real" } as unknown as Store;
const realUser = { id: "user-1", email: "real@example.com", user_metadata: {} };

function deps(overrides: Partial<SessionDeps> = {}): SessionDeps {
  return {
    mightHaveSession: false,
    demoRequested: false,
    signedIn: vi.fn(async () => ({ user: realUser, store: realStore })),
    demoStore: vi.fn(() => ({ marker: "demo" }) as unknown as Store),
    ...overrides,
  };
}

describe("resolveVisitor", () => {
  it("lets a real session beat the demo cookie", async () => {
    const d = deps({ mightHaveSession: true, demoRequested: true });
    const session = await resolveVisitor(d);

    expect(session).toEqual({ kind: "user", user: realUser, store: realStore });
    expect(d.demoStore).not.toHaveBeenCalled();
  });

  it("gives the demo to a visitor with only the demo cookie", async () => {
    const d = deps({ demoRequested: true });
    const session = await resolveVisitor(d);

    expect(session.kind).toBe("demo");
    if (session.kind !== "demo") return;
    expect(session.user.id).toBe(DEMO_USER_ID);
    expect(d.demoStore).toHaveBeenCalledTimes(1);
  });

  it("never reaches Supabase for a demo visitor", async () => {
    const d = deps({ demoRequested: true, mightHaveSession: false });
    await resolveVisitor(d);
    expect(d.signedIn).not.toHaveBeenCalled();
  });

  it("falls back to the demo when a stale Supabase cookie has no session behind it", async () => {
    const d = deps({
      mightHaveSession: true,
      demoRequested: true,
      signedIn: vi.fn(async () => null),
    });
    expect((await resolveVisitor(d)).kind).toBe("demo");
  });

  it("is anonymous with neither, and doesn't build a client to find out", async () => {
    const d = deps();
    expect(await resolveVisitor(d)).toEqual({ kind: "anonymous" });
    expect(d.signedIn).not.toHaveBeenCalled();
    expect(d.demoStore).not.toHaveBeenCalled();
  });

  it("is anonymous when a Supabase cookie holds no session", async () => {
    const d = deps({ mightHaveSession: true, signedIn: vi.fn(async () => null) });
    expect(await resolveVisitor(d)).toEqual({ kind: "anonymous" });
  });
});

describe("resolveSession", () => {
  beforeEach(() => {
    jar.cookies.clear();
    supabase.fixtures = false;
    supabase.signedIn.mockReset();
    supabase.signedIn.mockResolvedValue({ user: realUser, store: realStore });
  });

  it("serves the demo from the cookie alone, without calling Supabase", async () => {
    jar.cookies.set(DEMO_COOKIE, DEMO_COOKIE_VALUE);

    const session = await resolveSession();
    expect(session.kind).toBe("demo");
    expect(supabase.signedIn).not.toHaveBeenCalled();
  });

  it("ignores a demo cookie with any other value", async () => {
    jar.cookies.set(DEMO_COOKIE, "true");
    expect((await resolveSession()).kind).toBe("anonymous");
    expect(supabase.signedIn).not.toHaveBeenCalled();
  });

  it("prefers the real session when both cookies are present", async () => {
    jar.cookies.set(DEMO_COOKIE, DEMO_COOKIE_VALUE);
    jar.cookies.set("sb-abcdefgh-auth-token", "{}");

    const session = await resolveSession();
    expect(session).toMatchObject({ kind: "user", user: { id: "user-1" } });
  });

  it("asks Supabase when the dev fixtures stand in for it", async () => {
    supabase.fixtures = true;
    expect((await resolveSession()).kind).toBe("user");
    expect(supabase.signedIn).toHaveBeenCalled();
  });
});
