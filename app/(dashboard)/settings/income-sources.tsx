"use client";

import { useState, useTransition } from "react";
import { Plus, Wallet, X } from "lucide-react";
import {
  createIncomeSource,
  deleteIncomeSource,
} from "./actions";
import {
  INCOME_RECURRENCE_OPTIONS,
  monthlyIncome,
  sourceMonthlyAmount,
  type IncomeSource,
} from "@/lib/utils/income";
import { formatCurrency } from "@/lib/utils/format";
import { recurrenceLabel } from "@/lib/utils/recurrence";
import { useErrorShake } from "@/lib/hooks/use-error-shake";

interface IncomeSourcesProps {
  sources: IncomeSource[];
}

const FIELD_CLASS =
  "w-full rounded border border-[var(--color-border-strong)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)] transition-all focus:border-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-subtle)]";

export function IncomeSources({ sources }: IncomeSourcesProps) {
  const [adding, setAdding] = useState(false);
  const total = monthlyIncome(sources);

  return (
    <div className="space-y-4">
      {sources.length > 0 ? (
        <>
          <ul className="divide-y divide-[var(--color-border)]">
            {sources.map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </ul>
          <p className="flex items-baseline justify-between border-t border-[var(--color-border)] pt-3 text-sm">
            <span className="text-[var(--color-foreground-muted)]">
              Coming in this month
            </span>
            <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
              {formatCurrency(total)}/mo
            </span>
          </p>
        </>
      ) : (
        <div className="rounded border border-dashed border-[var(--color-border-strong)] p-6 text-center">
          <Wallet
            size={24}
            className="mx-auto text-[var(--color-foreground-subtle)]"
            aria-hidden
          />
          <p className="mt-2 text-sm text-[var(--color-foreground-muted)]">
            No income yet. Without it, Tally assumes everything you spend comes
            out of savings.
          </p>
        </div>
      )}

      {adding ? (
        <AddForm onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)]"
        >
          <Plus size={15} aria-hidden />
          Add income
        </button>
      )}
    </div>
  );
}

function SourceRow({ source }: { source: IncomeSource }) {
  const [isPending, startTransition] = useTransition();
  const monthly = sourceMonthlyAmount(source);
  const cadence = recurrenceLabel(source.recurrence).toLowerCase();

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
          {source.name}
        </p>
        <p className="truncate text-xs text-[var(--color-foreground-muted)]">
          {formatCurrency(Number(source.amount))} {cadence}
          {windowLabel(source)}
        </p>
      </div>

      <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
        {formatCurrency(monthly)}
        <span className="font-normal text-[var(--color-foreground-muted)]">/mo</span>
      </p>

      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteIncomeSource(source.id);
          })
        }
        aria-label={`Remove ${source.name}`}
        className="shrink-0 rounded p-1.5 text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-status-red-bg)] hover:text-[var(--color-status-red)] disabled:opacity-50"
      >
        <X size={15} aria-hidden />
      </button>
    </li>
  );
}

/** " · until 30 Jun 2027", or nothing when it runs indefinitely. */
function windowLabel(source: IncomeSource): string {
  const parts: string[] = [];
  if (source.starts_on) parts.push(`from ${shortDate(source.starts_on)}`);
  if (source.ends_on) parts.push(`until ${shortDate(source.ends_on)}`);
  return parts.length > 0 ? ` · ${parts.join(", ")}` : "";
}

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | string>("");
  const [recurrence, setRecurrence] = useState("monthly");
  const [endsOn, setEndsOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ref: shakeRef, shake } = useErrorShake<HTMLButtonElement>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await createIncomeSource({
      name,
      amount,
      recurrence,
      ends_on: endsOn,
    });

    if (result.error) {
      setError(result.error);
      shake();
      setSubmitting(false);
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-foreground)]">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Salary, freelance…"
            required
            autoFocus
            className={FIELD_CLASS}
          />
        </label>

        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-foreground)]">
            Amount
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
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-foreground)]">
            How often
          </span>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className={FIELD_CLASS}
          >
            {INCOME_RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--color-foreground)]">
            Until{" "}
            <span className="font-normal text-[var(--color-foreground-muted)]">
              (optional)
            </span>
          </span>
          <input
            type="date"
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
      </div>

      <p className="text-xs text-[var(--color-foreground-muted)]">
        {endsOn
          ? "The projection stops counting this after that date."
          : "Leave the end date blank if it has no end in sight."}
      </p>

      <div className="t-input-wrap flex gap-2">
        <button
          ref={shakeRef}
          type="submit"
          disabled={submitting || !name.trim() || !amount}
          className="btn-primary t-input flex-1 px-4 py-2 text-sm"
        >
          {submitting ? "Saving…" : "Add income"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground-muted)] transition-colors hover:bg-[var(--color-surface)]"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--color-status-red)]">{error}</p>
      )}
    </form>
  );
}
