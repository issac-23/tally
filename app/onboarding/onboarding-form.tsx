"use client";

import { useState } from "react";
import { completeOnboarding } from "./actions";

interface OnboardingFormProps {
  initialSavings?: number;
  initialSalary?: number;
}

export function OnboardingForm({
  initialSavings = 0,
  initialSalary = 0,
}: OnboardingFormProps) {
  const [savings, setSavings] = useState<number | string>(initialSavings || "");
  const [salary, setSalary] = useState<number | string>(initialSalary || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await completeOnboarding(
      Number(savings),
      Number(salary)
    );

    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
    // On success, the action redirects to /dashboard.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field
        label="Current savings balance"
        hint="Cash you have right now — checking, savings, however you think of it."
        value={savings}
        onChange={setSavings}
      />

      <Field
        label="Monthly salary (after taxes)"
        hint="Take-home pay per month. Use your average if it varies."
        value={salary}
        onChange={setSalary}
      />

      <button
        type="submit"
        disabled={submitting || savings === "" || salary === ""}
        className="w-full bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white font-medium rounded px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Setting things up..." : "Continue to dashboard"}
      </button>

      {error && (
        <p className="text-xs text-[var(--color-status-red)] text-center">
          {error}
        </p>
      )}

      <p className="text-xs text-[var(--color-foreground-subtle)] text-center">
        You can change these anytime in Settings.
      </p>
    </form>
  );
}

interface FieldProps {
  label: string;
  hint: string;
  value: number | string;
  onChange: (value: number | string) => void;
}

function Field({ label, hint, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--color-foreground)]">
        {label}
      </label>
      <p className="text-xs text-[var(--color-foreground-muted)] leading-relaxed">
        {hint}
      </p>
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
          placeholder="0.00"
          className="w-full bg-white border border-[var(--color-border-strong)] rounded pl-7 pr-3 py-2.5 text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-brand)] focus:ring-2 focus:ring-[var(--color-brand-subtle)] transition-all"
        />
      </div>
    </div>
  );
}
