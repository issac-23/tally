import { describe, it, expect } from "vitest";
import {
  classifyVisitor,
  hasSupabaseAuthCookie,
  isDemoCookie,
  DEMO_COOKIE_VALUE,
} from "./cookie";

describe("hasSupabaseAuthCookie", () => {
  it("finds the session cookie, whole or in chunks", () => {
    expect(hasSupabaseAuthCookie(["sb-abcd-auth-token"])).toBe(true);
    expect(hasSupabaseAuthCookie(["theme", "sb-abcd-auth-token.0", "sb-abcd-auth-token.1"])).toBe(true);
  });

  it("does not take the sign-in leftovers or other cookies for a session", () => {
    expect(hasSupabaseAuthCookie([])).toBe(false);
    expect(hasSupabaseAuthCookie(["sb-abcd-auth-token-code-verifier"])).toBe(false);
    expect(hasSupabaseAuthCookie(["sb-abcd-auth-token-flows-code-verifier"])).toBe(false);
    expect(hasSupabaseAuthCookie(["sb-abcd-auth-token-flow-1f2e-code-verifier"])).toBe(false);
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

describe("classifyVisitor", () => {
  const c = (name: string, value = "x") => ({ name, value });

  it("sees nothing in a request with no relevant cookies", () => {
    expect(classifyVisitor([])).toEqual({ mightHaveSession: false, demoRequested: false });
    expect(classifyVisitor([c("theme")])).toEqual({ mightHaveSession: false, demoRequested: false });
  });

  it("sees a demo request from the demo cookie alone", () => {
    expect(classifyVisitor([c("tally_demo", "1")])).toEqual({
      mightHaveSession: false,
      demoRequested: true,
    });
  });

  it("does not take another demo value for a request", () => {
    expect(classifyVisitor([c("tally_demo", "yes")]).demoRequested).toBe(false);
  });

  it("sees a possible session from an auth cookie, with or without the demo", () => {
    expect(classifyVisitor([c("sb-abcd-auth-token.0")])).toEqual({
      mightHaveSession: true,
      demoRequested: false,
    });
    expect(classifyVisitor([c("sb-abcd-auth-token"), c("tally_demo", "1")])).toEqual({
      mightHaveSession: true,
      demoRequested: true,
    });
  });

  it("does not take a sign-in leftover for a session", () => {
    expect(classifyVisitor([c("sb-abcd-auth-token-code-verifier")]).mightHaveSession).toBe(false);
  });

  it("counts the dev fixtures as a possible session", () => {
    expect(classifyVisitor([], true)).toEqual({ mightHaveSession: true, demoRequested: false });
  });
});
