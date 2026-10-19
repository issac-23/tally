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

import { today as todayKey } from "./calendar";
import { type Recurrence } from "./recurrence";
import {
  isoDate,
  optionalText,
  positiveMoney,
  recurrenceField,
} from "./fields";
import { MAX_DESCRIPTION_LENGTH, MAX_MERCHANT_LENGTH } from "./limits";

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
  today: string = todayKey()
): ValidationResult {
  const amount = positiveMoney(input.amount);
  if (!amount.ok) return amount;

  if (!input.category_id) {
    return { ok: false, error: "Pick a category." };
  }

  const date = isoDate(input.date, "Pick a date.");
  if (!date.ok) return date;
  if (date.value > today) {
    return { ok: false, error: "That date is in the future." };
  }
  if (date.value < MIN_DATE) {
    return { ok: false, error: "That date is too far in the past." };
  }

  // Guarded here as well as by the CHECK constraint, so a bad value comes
  // back as a readable message instead of a Postgres constraint error.
  const recurrence = recurrenceField(
    input.recurrence,
    "Pick how often this repeats."
  );
  if (!recurrence.ok) return recurrence;

  const description = optionalText(input.description, MAX_DESCRIPTION_LENGTH, "note");
  if (!description.ok) return description;
  const merchant = optionalText(input.merchant, MAX_MERCHANT_LENGTH, "merchant");
  if (!merchant.ok) return merchant;

  return {
    ok: true,
    fields: {
      amount: amount.value,
      category_id: input.category_id,
      description: description.value,
      merchant: merchant.value,
      date: date.value,
      recurrence: recurrence.value,
    },
  };
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
