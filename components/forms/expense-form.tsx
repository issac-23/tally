"use client";

import { useState } from "react";
import { createTransaction } from "@/app/(dashboard)/transactions/new/actions";
import { updateTransaction } from "@/app/(dashboard)/transactions/actions";
import { useErrorShake } from "@/lib/hooks/use-error-shake";
import {
  RECURRENCE_OPTIONS,
  monthlyEquivalent,
  recurrenceOption,
  type Recurrence,
} from "@/lib/utils/recurrence";
import { hasChanges, type TransactionFields } from "@/lib/utils/transaction-input";
import { formatCurrency } from "@/lib/utils/format";
import type { Category } from "@/types";

/** The subset of a row the form needs to reopen it for editing. */
export interface EditableTransaction {
  id: string;
  amount: number | string;
  category_id: string | null;
  description: string | null;
  merchant: string | null;
  date: string;
  recurrence: string | null;
}

interface ExpenseFormProps {
  categories: Pick<Category, "id" | "name" | "icon" | "color">[];
  /** Omit to create. Pass a row to edit it in place. */
  transaction?: EditableTransaction;
}

const FIELD_CLASS =
  "w-full bg-white border border-[var(--color-border-strong)] rounded px-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all";

export function ExpenseForm({ categories, transaction }: ExpenseFormProps) {
  const today = new Date().toISOString().slice(0, 10);
  const editing = transaction !== undefined;

  const [amount, setAmount] = useState<number | string>(
    transaction ? Number(transaction.amount) : ""
  );
  // Deliberately unset when creating. Defaulting to categories[0] silently
  // files expenses under whichever preset sorts first alphabetically
  // ("Entertainment"), which is a wrong answer presented as a choice the
  // user made.
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [merchant, setMerchant] = useState(transaction?.merchant ?? "");
  const [date, setDate] = useState(transaction?.date ?? today);
  const [recurrence, setRecurrence] = useState<Recurrence>(
    (transaction?.recurrence as Recurrence) ?? "once"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ref: shakeRef, shake } = useErrorShake<HTMLButtonElement>();

  const current: TransactionFields = {
    amount: Number(amount),
    category_id: categoryId,
    description: description.trim() || null,
    merchant: merchant.trim() || null,
    date,
    recurrence,
  };

  // Saving an untouched row would bump updated_at and flash a success state
  // for a write that changed nothing, so the button stays off until
  // something actually moved.
  const dirty =
    !transaction ||
    hasChanges(
      {
        amount: Number(transaction.amount),
        category_id: transaction.category_id ?? "",
        description: transaction.description,
        merchant: transaction.merchant,
        date: transaction.date,
        recurrence: (transaction.recurrence as Recurrence) ?? "once",
      },
      current
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Both actions redirect on success, so anything that comes back is a
    // failure and the form has to stay usable.
    const result = transaction
      ? await updateTransaction(transaction.id, current)
      : await createTransaction(current);

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
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-[var(--color-foreground)]"
          >
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)] text-sm">
              $
            </span>
            <input
              id="amount"
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
              className={`${FIELD_CLASS} pl-7 pr-3`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="date"
            className="block text-sm font-medium text-[var(--color-foreground)]"
          >
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
            className={FIELD_CLASS}
          />
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-[var(--color-foreground)]"
        >
          Category
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className={`${FIELD_CLASS} ${
            categoryId ? "" : "text-[var(--color-foreground-muted)]"
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

      {/* How often it repeats */}
      <div className="space-y-1.5">
        <label
          htmlFor="recurrence"
          className="block text-sm font-medium text-[var(--color-foreground)]"
        >
          How often
        </label>
        <select
          id="recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          className={FIELD_CLASS}
        >
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {recurrenceOption(recurrence).perMonth === 0 ? (
            "Counted once, in the 30 days after it happened."
          ) : Number(amount) > 0 ? (
            <>
              Counts as{" "}
              <span className="font-medium text-[var(--color-foreground)] tabular-nums">
                {formatCurrency(monthlyEquivalent(Number(amount), recurrence))}
                /mo
              </span>{" "}
              toward your runway, every month.
            </>
          ) : (
            "Counted toward your runway every month, not just this one."
          )}
        </p>
      </div>

      {/* Merchant */}
      <div className="space-y-1.5">
        <label
          htmlFor="merchant"
          className="block text-sm font-medium text-[var(--color-foreground)]"
        >
          Merchant{" "}
          <span className="text-[var(--color-foreground-muted)] font-normal">
            (optional)
          </span>
        </label>
        <input
          id="merchant"
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Starbucks, Amazon, Target..."
          className={FIELD_CLASS}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label
          htmlFor="note"
          className="block text-sm font-medium text-[var(--color-foreground)]"
        >
          Note{" "}
          <span className="text-[var(--color-foreground-muted)] font-normal">
            (optional)
          </span>
        </label>
        <input
          id="note"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Lunch with Sam"
          className={FIELD_CLASS}
        />
      </div>

      <div className="t-input-wrap space-y-3">
        <button
          ref={shakeRef}
          type="submit"
          disabled={submitting || !amount || !categoryId || !dirty}
          className="btn-primary t-input w-full px-4 py-3"
        >
          {submitting
            ? "Saving..."
            : editing
              ? dirty
                ? "Save changes"
                : "No changes yet"
              : "Add expense"}
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
