/**
 * Forward projection of savings balance based on current state plus assumed
 * constant net monthly cash flow (salary minus average spending).
 *
 * No history reconstruction — we only have a snapshot of the current balance,
 * not a time series, so projecting forward is the only honest direction.
 */

export interface ProjectionPoint {
  /** Months from now. 0 = today, 1 = one month from now, etc. */
  month: number;
  /** Projected balance at that month. Floored at 0 for display. */
  balance: number;
}

export interface SavingsProjection {
  points: ProjectionPoint[];
  /**
   * Exact (possibly fractional) month when the projection crosses zero.
   * Null when not depleting, or when depletion falls beyond the window.
   */
  depletionMonth: number | null;
  /** Net flow is negative (spending exceeds income). */
  isDepleting: boolean;
  /** Monthly cash flow: salary - avg spend. */
  monthlyNet: number;
}

const DEFAULT_PROJECTION_MONTHS = 12;

export function projectSavings(
  currentSavings: number,
  monthlySalary: number,
  monthlyAvgSpend: number,
  months: number = DEFAULT_PROJECTION_MONTHS
): SavingsProjection {
  const monthlyNet = monthlySalary - monthlyAvgSpend;
  const isDepleting = monthlyNet < 0;

  // Build month-by-month points, flooring at zero so the line doesn't dip
  // below the axis after depletion.
  const points: ProjectionPoint[] = [];
  for (let m = 0; m <= months; m++) {
    const raw = currentSavings + monthlyNet * m;
    points.push({ month: m, balance: Math.max(0, raw) });
  }

  // Compute exact depletion month (float) if it falls within the window.
  let depletionMonth: number | null = null;
  if (isDepleting && currentSavings > 0) {
    const exact = currentSavings / -monthlyNet;
    if (exact <= months) {
      depletionMonth = exact;
    }
  } else if (currentSavings <= 0 && isDepleting) {
    depletionMonth = 0;
  }

  return { points, depletionMonth, isDepleting, monthlyNet };
}
