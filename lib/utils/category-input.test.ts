import { describe, it, expect } from "vitest";
import { validateCategoryInput } from "./category-input";

describe("validateCategoryInput", () => {
  it("trims the name and keeps the colour", () => {
    expect(validateCategoryInput("  Pets ", "#aBc123")).toEqual({
      ok: true,
      fields: { name: "Pets", color: "#aBc123" },
    });
  });

  it("counts the trimmed name against the bounds", () => {
    expect(validateCategoryInput(" a ", "#112233").ok).toBe(false);
    expect(validateCategoryInput("ab", "#112233").ok).toBe(true);
    expect(validateCategoryInput("x".repeat(32), "#112233").ok).toBe(true);
    expect(validateCategoryInput("x".repeat(33), "#112233").ok).toBe(false);
  });

  it("wants a six-digit hex colour", () => {
    expect(validateCategoryInput("Pets", "#123").ok).toBe(false);
    expect(validateCategoryInput("Pets", "112233").ok).toBe(false);
  });
});
