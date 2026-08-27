"use client";

import { useState, useTransition } from "react";
import { Tag } from "lucide-react";
import { createCategory, deleteCategory } from "./actions";

const CATEGORY_COLORS = [
  "#D4762C",
  "#666A86",
  "#059669",
  "#C49A0A",
  "#A0728A",
  "#5A8A9A",
] as const;

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

interface CategoryFormProps {
  /** The user's own categories. Presets aren't editable, so they're excluded. */
  categories: CustomCategory[];
}

export function CategoryForm({ categories }: CategoryFormProps) {
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

      <CategoryList categories={categories} />
    </form>
  );
}

/**
 * Without this the form was write-only: you could add "Books" and the only
 * evidence it worked was a two-word "Added" that timed out.
 */
function CategoryList({ categories }: { categories: CustomCategory[] }) {
  return (
    <div className="border-t border-[var(--color-border)] pt-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
        Your categories
      </p>

      {categories.length === 0 ? (
        <p className="text-sm text-[var(--color-foreground-muted)]">
          None yet. The presets cover most spending — add one here when
          something doesn&apos;t fit.
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {categories.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-foreground-subtle)]">
            Removing a category keeps its expenses — they move to
            Uncategorized.
          </p>
        </>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: CustomCategory }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <li className="flex items-center gap-2.5 rounded px-2 py-2 hover:bg-[var(--color-surface)]">
      <span
        className="h-4 w-4 shrink-0 rounded-sm"
        style={{ backgroundColor: category.color }}
        aria-hidden
      />
      <Tag size={14} className="shrink-0 text-[var(--color-foreground-subtle)]" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-foreground)]">
        {category.name}
      </span>

      {error ? (
        <span className="text-xs text-[var(--color-status-red)]">{error}</span>
      ) : (
        <button
          type="button"
          onClick={handleDelete}
          onBlur={() => setConfirming(false)}
          disabled={isPending}
          className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
            confirming
              ? "bg-[var(--color-status-red-bg)] text-[var(--color-status-red)] hover:bg-[var(--color-status-red)] hover:text-white"
              : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-status-red-bg)] hover:text-[var(--color-status-red)]"
          }`}
        >
          {isPending ? "Removing…" : confirming ? "Confirm" : "Remove"}
        </button>
      )}
    </li>
  );
}
