/**
 * What comes in each month.
 *
 * A single `monthly_salary` said one number, forever. Real income is a set
 * of things with their own cadences — a paycheck every two weeks, a retainer
 * every month, a dividend twice a year.
 */

import { monthlyEquivalent } from "./recurrence";

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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
