"use client";

import { useState } from "react";
import { createTransaction } from "./actions";
import { useErrorShake } from "@/lib/hooks/use-error-shake";
import type { Category } from "@/types";

interface ExpenseFormProps {
  categories: Pick<Category, "id" | "name" | "icon" | "color">[];
}

export function ExpenseForm({ categories }: ExpenseFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState<number | string>("");
  // Deliberately unset. Defaulting to categories[0] silently files expenses
  // under whichever preset sorts first alphabetically ("Entertainment"),
  // which is a wrong answer presented as a choice the user made.
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ref: shakeRef, shake } = useErrorShake<HTMLButtonElement>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createTransaction({
      amount: Number(amount),
      category_id: categoryId,
      description: description.trim(),
      merchant: merchant.trim(),
      date,
    });

    if (result?.error) {
      setError(result.error);
      shake();
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount + Date row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)] text-sm">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                setAmount(v === "" ? "" : Number(v));
              }}
              placeholder="0.00"
              required
              autoFocus
              className="w-full bg-white border border-[var(--color-border-strong)] rounded pl-7 pr-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
            className="w-full bg-white border border-[var(--color-border-strong)] rounded px-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all"
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Category
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className={`w-full bg-white border border-[var(--color-border-strong)] rounded px-3 py-2.5 focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all ${
            categoryId
              ? "text-[var(--color-foreground)]"
              : "text-[var(--color-foreground-muted)]"
          }`}
        >
          <option value="" disabled>
            Choose a category…
          </option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Merchant */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Merchant <span className="text-[var(--color-foreground-muted)] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Starbucks, Amazon, Target..."
          className="w-full bg-white border border-[var(--color-border-strong)] rounded px-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--color-foreground)]">
          Note <span className="text-[var(--color-foreground-muted)] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Lunch with Sam"
          className="w-full bg-white border border-[var(--color-border-strong)] rounded px-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all"
        />
      </div>

      <div className="t-input-wrap space-y-3">
        <button
          ref={shakeRef}
          type="submit"
          disabled={submitting || !amount || !categoryId}
          className="btn-primary t-input w-full px-4 py-3"
        >
          {submitting ? "Saving..." : "Add expense"}
        </button>

        {error && (
          <p className="text-xs text-[var(--color-status-red)] text-center">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
