/**
 * The one place an expense is checked before it reaches the database.
 *
 * Creating and editing an expense are the same operation with a different
 * verb, so they have to agree on what a valid expense is. When the rules
 * lived inside the create action, edit had no way to reuse them without
 * importing a server action, and the two would have drifted the first time
 * a rule changed.
 *
 * Pure on purpose: no Supabase, no cookies, no `"use server"`. That makes
 * every rule testable without a database and keeps the actions thin.
 */

import { isRecurrence, type Recurrence } from "./recurrence";

export interface TransactionInput {
  amount: number | string;
  category_id: string;
  description?: string | null;
  merchant?: string | null;
  date: string; // YYYY-MM-DD
  recurrence?: string | null;
}

/** A validated expense, shaped exactly like a row in `transactions`. */
export interface TransactionFields {
  amount: number;
  category_id: string;
  description: string | null;
  merchant: string | null;
  date: string;
  recurrence: Recurrence;
}

export type ValidationResult =
  | { ok: true; fields: TransactionFields }
  | { ok: false; error: string };

/** Postgres `date` only goes so far, and a typo'd year shouldn't be storable. */
const MIN_DATE = "1900-01-01";

export function validateTransactionInput(
  input: TransactionInput,
  today: string = new Date().toISOString().slice(0, 10)
): ValidationResult {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }
  // Money has two decimal places. Rounding here rather than rejecting keeps
  // a pasted "12.345" from bouncing the user back to the form.
  const rounded = Math.round(amount * 100) / 100;

  if (!input.category_id) {
    return { ok: false, error: "Pick a category." };
  }

  if (!isIsoDate(input.date)) {
    return { ok: false, error: "Pick a date." };
  }
  if (input.date > today) {
    return { ok: false, error: "That date is in the future." };
  }
  if (input.date < MIN_DATE) {
    return { ok: false, error: "That date is too far in the past." };
  }

  // Guarded here as well as by the CHECK constraint, so a bad value comes
  // back as a readable message instead of a Postgres constraint error.
  const recurrence = input.recurrence ?? "once";
  if (!isRecurrence(recurrence)) {
    return { ok: false, error: "Pick how often this repeats." };
  }

  return {
    ok: true,
    fields: {
      amount: rounded,
      category_id: input.category_id,
      // Empty strings become null so "no note" is one value in the database
      // rather than two that render identically.
      description: blankToNull(input.description),
      merchant: blankToNull(input.merchant),
      date: input.date,
      recurrence,
    },
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  // `new Date("2026-02-31")` rolls over to March rather than failing, so
  // compare the round trip instead of trusting the parse.
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * Whether an edit actually changed anything.
 *
 * Opening a row, changing nothing and hitting save shouldn't write to the
 * database or bump `updated_at` — and it definitely shouldn't show a success
 * state that implies something happened.
 */
export function hasChanges(
  before: TransactionFields,
  after: TransactionFields
): boolean {
  return (
    before.amount !== after.amount ||
    before.category_id !== after.category_id ||
    before.description !== after.description ||
    before.merchant !== after.merchant ||
    before.date !== after.date ||
    before.recurrence !== after.recurrence
  );
}
