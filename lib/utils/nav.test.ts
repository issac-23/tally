import { describe, it, expect } from "vitest";
import { isActiveRoute } from "./nav";

describe("isActiveRoute", () => {
  it("returns true for an exact match", () => {
    expect(isActiveRoute("/dashboard", "/dashboard")).toBe(true);
  });

  it("returns true for a nested route at a path boundary", () => {
    expect(isActiveRoute("/transactions/new", "/transactions")).toBe(true);
  });

  it("returns false when the href is just a string prefix, not a path boundary", () => {
    // Without the boundary check, "/transactionsplus" would match "/transactions".
    expect(isActiveRoute("/transactionsplus", "/transactions")).toBe(false);
  });

  it("returns false for unrelated routes", () => {
    expect(isActiveRoute("/settings", "/transactions")).toBe(false);
  });

  it("returns true for a deeply nested route", () => {
    expect(isActiveRoute("/transactions/123/edit", "/transactions")).toBe(true);
  });

  it("only matches the root href on an exact root path", () => {
    expect(isActiveRoute("/", "/")).toBe(true);
    expect(isActiveRoute("/dashboard", "/")).toBe(false);
  });
});
