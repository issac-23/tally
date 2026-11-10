import { describe, it, expect } from "vitest";
import { hasSupabaseAuthCookie, isDemoCookie, DEMO_COOKIE_VALUE } from "./cookie";

describe("hasSupabaseAuthCookie", () => {
  it("finds the session cookie, whole or in chunks", () => {
    expect(hasSupabaseAuthCookie(["sb-abcd-auth-token"])).toBe(true);
    expect(hasSupabaseAuthCookie(["theme", "sb-abcd-auth-token.0", "sb-abcd-auth-token.1"])).toBe(true);
  });

  it("does not take the sign-in leftovers or other cookies for a session", () => {
    expect(hasSupabaseAuthCookie([])).toBe(false);
    expect(hasSupabaseAuthCookie(["sb-abcd-auth-token-code-verifier"])).toBe(false);
    expect(hasSupabaseAuthCookie(["tally_demo", "theme"])).toBe(false);
    expect(hasSupabaseAuthCookie(["not-sb-abcd-auth-token"])).toBe(false);
  });
});

describe("isDemoCookie", () => {
  it("accepts only the value the demo route sets", () => {
    expect(isDemoCookie(DEMO_COOKIE_VALUE)).toBe(true);
    expect(isDemoCookie(undefined)).toBe(false);
    expect(isDemoCookie("")).toBe(false);
    expect(isDemoCookie("true")).toBe(false);
  });
});
