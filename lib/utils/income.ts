/**
 * What comes in each month.
 *
 * A single `monthly_salary` said one number, forever. Real income is a set
 * of things with their own cadences — a paycheck every two weeks, a retainer
 * every month, a dividend twice a year.
 */

import { monthKey } from "./calendar";
import { RECURRENCE_OPTIONS, monthlyEquivalent } from "./recurrence";
import {
  optionalIsoDate,
  positiveMoney,
  recurrenceField,
  requiredText,
} from "./fields";
import { MAX_INCOME_NAME_LENGTH } from "./limits";

/**
 * The cadences income can have.
 *
 * "One-off" and "daily" are dropped: a single payment isn't a source, and
 * nobody is paid daily. Sharing the rest with expenses means a fortnightly
 * paycheck and a fortnightly bill are described the same way.
 */
export const INCOME_RECURRENCE_OPTIONS = RECURRENCE_OPTIONS.filter(
  (option) => option.value !== "once" && option.value !== "daily"
);

export function isIncomeRecurrence(value: unknown): boolean {
  return INCOME_RECURRENCE_OPTIONS.some((option) => option.value === value);
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number | string;
  recurrence: string;
  /** Null means it's already running. */
  starts_on?: string | null;
  /** Null means no end in sight. */
  ends_on?: string | null;
}

/**
 * Whether a source pays out during the calendar month containing `date`.
 *
 * Compared at month granularity, not day: a contract ending on the 14th
 * still pays that month, and treating it as already over would understate
 * the runway.
 */
export function isActiveIn(source: IncomeSource, date: Date): boolean {
  const month = monthKey(date);
  if (source.starts_on && monthKeyOf(source.starts_on) > month) return false;
  if (source.ends_on && monthKeyOf(source.ends_on) < month) return false;
  return true;
}

/**
 * Income for each of the next `months` months, index 0 being this one.
 *
 * The projection walks this rather than multiplying one number, which is
 * what makes a contract ending mid-window visible as a bend in the line.
 */
export function incomeByMonth(
  sources: IncomeSource[],
  months: number,
  from: Date = new Date()
): number[] {
  const schedule: number[] = [];
  for (let m = 0; m <= months; m++) {
    // Day 1 avoids the month-end rollover: adding a month to 31 March gives
    // 31 April, which is 1 May.
    const month = new Date(from.getFullYear(), from.getMonth() + m, 1);
    schedule.push(monthlyIncome(sources, month));
  }
  return schedule;
}

/** YYYY-MM-DD → YYYY-MM, without going through Date and its timezones. */
function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** What one source contributes per month, whatever its cadence. */
export function sourceMonthlyAmount(source: IncomeSource): number {
  return monthlyEquivalent(source.amount, source.recurrence);
}

/** Everything paying out in the month containing `on`, combined. */
export function monthlyIncome(
  sources: IncomeSource[],
  on: Date = new Date()
): number {
  return sources
    .filter((s) => isActiveIn(s, on))
    .reduce((sum, s) => sum + sourceMonthlyAmount(s), 0);
}

export interface IncomeInput {
  name: string;
  amount: number | string;
  recurrence: string;
  starts_on?: string | null;
  ends_on?: string | null;
}

export interface IncomeFields {
  name: string;
  amount: number;
  recurrence: string;
  starts_on: string | null;
  ends_on: string | null;
}

export type IncomeValidation =
  | { ok: true; fields: IncomeFields }
  | { ok: false; error: string };

/**
 * Checked here as well as by the CHECK constraints, so a bad value comes
 * back as a readable message instead of a Postgres error.
 */
export function validateIncomeInput(input: IncomeInput): IncomeValidation {
  const name = requiredText(
    input.name,
    MAX_INCOME_NAME_LENGTH,
    "name",
    "Give it a name."
  );
  if (!name.ok) return name;

  const amount = positiveMoney(input.amount);
  if (!amount.ok) return amount;

  const recurrence = recurrenceField(
    input.recurrence,
    "Pick how often it's paid.",
    INCOME_RECURRENCE_OPTIONS
  );
  if (!recurrence.ok) return recurrence;

  const startsOn = optionalIsoDate(input.starts_on, "That start date isn't a real date.");
  if (!startsOn.ok) return startsOn;
  const endsOn = optionalIsoDate(input.ends_on, "That end date isn't a real date.");
  if (!endsOn.ok) return endsOn;
  if (startsOn.value && endsOn.value && endsOn.value < startsOn.value) {
    return { ok: false, error: "It can't end before it starts." };
  }

  return {
    ok: true,
    fields: {
      name: name.value,
      amount: amount.value,
      recurrence: recurrence.value,
      starts_on: startsOn.value,
      ends_on: endsOn.value,
    },
  };
}
