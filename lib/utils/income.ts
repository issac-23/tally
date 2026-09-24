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
}

/** What one source contributes per month, whatever its cadence. */
export function sourceMonthlyAmount(source: IncomeSource): number {
  return monthlyEquivalent(source.amount, source.recurrence);
}

/** Everything coming in this month, combined. */
export function monthlyIncome(sources: IncomeSource[]): number {
  return sources.reduce((sum, s) => sum + sourceMonthlyAmount(s), 0);
}
