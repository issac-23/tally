/**
 * The rules for a single field, in one place.
 *
 * An expense, an income source and the profile all take an amount; an expense
 * and an income source both take dates, a recurrence and trimmed text. Each
 * validator used to spell those rules out for itself, so what counted as a
 * valid amount was decided three times. They call these instead and keep only
 * what is theirs: which fields exist, how they relate, and the order the
 * messages come in.
 *
 * Every field comes back as the cleaned value or the message to show, never
 * both and never a throw.
 */

import { blankToNull, isIsoDate } from "./input";
import {
  MAX_AMOUNT_MESSAGE,
  roundWithinCap,
  tooLongMessage,
} from "./limits";
import { isRecurrence, type Recurrence } from "./recurrence";

export type Field<T> = { ok: true; value: T } | { ok: false; error: string };

function invalid(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * An amount that has to be more than nothing: what an expense or an income
 * source costs or pays. Rounded to cents rather than rejected, so a pasted
 * "12.345" doesn't bounce the user back to the form.
 */
export function positiveMoney(input: number | string): Field<number> {
  const amount = Number(input);
  if (!Number.isFinite(amount) || amount <= 0) {
    return invalid("Amount must be greater than zero.");
  }
  const rounded = roundWithinCap(amount);
  if (rounded === null) return invalid(MAX_AMOUNT_MESSAGE);
  // 0.004 is more than nothing as typed and nothing once rounded, which the
  // amount > 0 CHECK constraints would reject.
  if (rounded <= 0) return invalid("Amount must be greater than zero.");
  return { ok: true, value: rounded };
}

/** An amount that may be zero but not negative: a savings balance. */
export function balanceMoney(input: number): Field<number> {
  if (!Number.isFinite(input)) return invalid("Please enter valid numbers.");
  if (input < 0) return invalid("Amounts can't be negative.");
  const rounded = roundWithinCap(input);
  if (rounded === null) return invalid(MAX_AMOUNT_MESSAGE);
  return { ok: true, value: rounded };
}

/**
 * Text the user may leave empty. Blank becomes null, so "no note" is one
 * value in the database rather than two that render identically.
 */
export function optionalText(
  input: string | null | undefined,
  max: number,
  what: string
): Field<string | null> {
  const value = blankToNull(input);
  if (value && value.length > max) return invalid(tooLongMessage(what, max));
  return { ok: true, value };
}

/** Text that must be there once trimmed. */
export function requiredText(
  input: string,
  max: number,
  what: string,
  missing: string
): Field<string> {
  const value = input.trim();
  if (value === "") return invalid(missing);
  if (value.length > max) return invalid(tooLongMessage(what, max));
  return { ok: true, value };
}

/** A real calendar date as YYYY-MM-DD. */
export function isoDate(input: unknown, error: string): Field<string> {
  return isIsoDate(input) ? { ok: true, value: input } : invalid(error);
}

/** A date the user may leave out. Blank is null; anything else must be real. */
export function optionalIsoDate(
  input: string | null | undefined,
  error: string
): Field<string | null> {
  const value = blankToNull(input);
  if (value === null) return { ok: true, value: null };
  return isIsoDate(value) ? { ok: true, value } : invalid(error);
}

/** Any recurrence an expense can have. */
export function recurrenceField(
  input: string | null | undefined,
  error: string
): Field<Recurrence>;
/** One of the recurrences in `allowed`, such as the ones income can have. */
export function recurrenceField(
  input: string | null | undefined,
  error: string,
  allowed: ReadonlyArray<{ value: string }>
): Field<string>;
export function recurrenceField(
  input: string | null | undefined,
  error: string,
  allowed?: ReadonlyArray<{ value: string }>
): Field<string> {
  const value = input ?? "once";
  const known = allowed
    ? allowed.some((option) => option.value === value)
    : isRecurrence(value);
  return known ? { ok: true, value } : invalid(error);
}
