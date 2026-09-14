/**
 * What's already spoken for each month.
 *
 * The runway maths already folds standing commitments into the burn rate,
 * but the number it produces is a single blended figure. "You're spending
 * $3,255/mo" doesn't tell you that $2,140 of it is rent, insurance and four
 * subscriptions you can't cancel by being careful at the supermarket.
 */

import {
  monthlyEquivalent,
  recurrenceBadge,
  recurringSeries,
  type Recurrence,
} from "./recurrence";

interface RecurringRow {
  amount: number | string;
  date: string; // YYYY-MM-DD
  merchant?: string | null;
  recurrence?: string | null;
  category_id?: string | null;
  category?: { id: string; name: string; icon: string; color: string } | null;
}

export interface Commitment {
  /** Stable across renders — same series key the dedupe uses. */
  key: string;
  /** What to call it in the list. */
  label: string;
  /** The amount as it was logged, at its own cadence. */
  amount: number;
  recurrence: Recurrence;
  /** "Monthly", "Every year", … Empty only for one-off, which can't appear here. */
  badge: string;
  /** What that cadence costs per month. */
  monthly: number;
  category: { id: string; name: string; icon: string; color: string } | null;
  /** Last time this commitment was logged. */
  date: string;
}

export interface CommitmentSummary {
  commitments: Commitment[];
  /** Monthly cost of every commitment combined. */
  total: number;
  /**
   * Income left after the commitments, or null when we don't know the
   * income. Can go negative, which is worth seeing.
   */
  remaining: number | null;
  /** 0–1 share of income the commitments eat, or null when income is 0. */
  shareOfIncome: number | null;
}

export function commitmentBreakdown(
  rows: RecurringRow[],
  monthlySalary: number
): CommitmentSummary {
  // recurringSeries collapses twelve months of logged rent into the one
  // commitment it actually represents, newest row winning.
  const commitments = recurringSeries(rows)
    .map((row) => {
      const recurrence = (row.recurrence ?? "once") as Recurrence;
      return {
        key: [
          recurrence,
          row.category?.id ?? row.category_id ?? "",
          (row.merchant ?? "").trim().toLowerCase(),
        ].join("|"),
        label: (row.merchant ?? "").trim() || row.category?.name || "Recurring expense",
        amount: Number(row.amount),
        recurrence,
        badge: recurrenceBadge(recurrence),
        monthly: monthlyEquivalent(row.amount, recurrence),
        category: row.category ?? null,
        date: row.date,
      };
    })
    // Biggest commitment first: the list is read to find what to cut.
    .sort((a, b) => b.monthly - a.monthly);

  const total = commitments.reduce((sum, c) => sum + c.monthly, 0);
  const salary = Number(monthlySalary);
  const known = Number.isFinite(salary) && salary > 0;

  return {
    commitments,
    total,
    remaining: known ? salary - total : null,
    shareOfIncome: known ? total / salary : null,
  };
}
