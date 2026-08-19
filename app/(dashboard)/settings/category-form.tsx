"use client";

import { useState } from "react";
import { createCategory } from "./actions";

const CATEGORY_COLORS = [
  "#D4762C",
  "#666A86",
  "#059669",
  "#C49A0A",
  "#A0728A",
  "#5A8A9A",
] as const;

export function CategoryForm() {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await createCategory(name, color);

    if (result.error) {
      setError(result.error);
    } else {
      setName("");
      setSuccess(true);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Category name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSuccess(false);
          }}
          maxLength={32}
          placeholder="Books, School, Coffee..."
          className="w-full rounded border border-[var(--color-border-strong)] bg-white px-3 py-2.5 text-[var(--color-foreground)] transition-all focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-subtle)]"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-[var(--color-foreground)]">
          Color
        </legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Use category color ${c}`}
              aria-pressed={color === c}
              className={`h-9 w-9 rounded border transition-transform hover:scale-105 ${
                color === c
                  ? "border-[var(--color-foreground)] ring-2 ring-[var(--color-brand-subtle)]"
                  : "border-[var(--color-border)]"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <button
          type="submit"
          disabled={submitting || name.trim().length < 2}
          className="rounded bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-light)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add category"}
        </button>

        {success && (
          <p className="text-xs text-[var(--color-status-green)]">Added</p>
        )}
      </div>

      {error && <p className="text-xs text-[var(--color-status-red)]">{error}</p>}
    </form>
  );
}
