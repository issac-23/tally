"use client";

import { useEffect, useState } from "react";
import { updateProfile } from "./actions";
import { SuccessCheck } from "@/components/ui/success-check";
import { useErrorShake } from "@/lib/hooks/use-error-shake";

const SAVED_BADGE_TIMEOUT_MS = 2500;

interface SettingsFormProps {
  initialSavings: number;
  initialSalary: number;
}

export function SettingsForm({
  initialSavings,
  initialSalary,
}: SettingsFormProps) {
  const [savings, setSavings] = useState<number | string>(initialSavings);
  const [salary, setSalary] = useState<number | string>(initialSalary);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { ref: shakeRef, shake } = useErrorShake<HTMLButtonElement>();

  // Detect dirty state so the Save button feels purposeful.
  const isDirty =
    Number(savings) !== initialSavings ||
    Number(salary) !== initialSalary;

  // Auto-clear the "Saved" confirmation so it doesn't linger.
  useEffect(() => {
    if (savedAt === null) return;
    const t = setTimeout(() => setSavedAt(null), SAVED_BADGE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [savedAt]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await updateProfile(Number(savings), Number(salary));

    if (result.error) {
      setError(result.error);
      shake();
    } else {
      setSavedAt(Date.now());
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field
        label="Savings balance"
        value={savings}
        onChange={setSavings}
      />
      <Field
        label="Monthly salary (after taxes)"
        value={salary}
        onChange={setSalary}
      />

      <div className="t-input-wrap space-y-3">
        <div className="flex items-center justify-between gap-3">
          <button
            ref={shakeRef}
            type="submit"
            disabled={submitting || !isDirty || savings === "" || salary === ""}
            className="btn-primary t-input px-4 py-2.5 text-sm"
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>

          <p
            className="flex items-center gap-1.5 text-xs text-[var(--color-status-green)]"
            aria-live="polite"
          >
            <SuccessCheck shown={Boolean(savedAt) && !isDirty && !error} />
            {savedAt && !isDirty && !error ? "Saved" : ""}
          </p>
        </div>

        {error && (
          <p className="text-xs text-[var(--color-status-red)]">{error}</p>
        )}
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  value: number | string;
  onChange: (value: number | string) => void;
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)] text-sm">
          $
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? "" : Number(v));
          }}
          className="w-full bg-white border border-[var(--color-border-strong)] rounded pl-7 pr-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all"
        />
      </div>
    </div>
  );
}
