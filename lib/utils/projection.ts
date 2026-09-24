/**
 * Forward projection of savings balance from the current balance plus net
 * monthly cash flow (income minus average spending). Income can vary month
 * to month; spending is assumed flat, because a 30-day average is all we
 * have to go on.
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
  /**
   * A flat monthly figure, or one entry per month when income changes
   * partway through — a contract ending, a raise starting. Short arrays
   * hold their last value for the rest of the window.
   */
  monthlyIncome: number | number[],
  monthlyAvgSpend: number,
  months: number = DEFAULT_PROJECTION_MONTHS
): SavingsProjection {
  const incomeIn = (month: number): number => {
    if (!Array.isArray(monthlyIncome)) return monthlyIncome;
    if (monthlyIncome.length === 0) return 0;
    return monthlyIncome[Math.min(month, monthlyIncome.length - 1)];
  };

  // Walk the balance forward a month at a time rather than multiplying one
  // net figure, so a change in income bends the line instead of tilting all
  // of it. Floored at zero so it doesn't dip below the axis after depletion.
  const points: ProjectionPoint[] = [{ month: 0, balance: Math.max(0, currentSavings) }];
  let balance = currentSavings;
  let depletionMonth: number | null = null;

  for (let m = 1; m <= months; m++) {
    const net = incomeIn(m - 1) - monthlyAvgSpend;
    const next = balance + net;

    // Catch the crossing inside the month it happens, and interpolate to
    // the fractional month rather than rounding to the boundary.
    if (depletionMonth === null && balance > 0 && next <= 0 && net < 0) {
      depletionMonth = m - 1 + balance / -net;
    }

    balance = next;
    points.push({ month: m, balance: Math.max(0, balance) });
  }

  const monthlyNet = incomeIn(0) - monthlyAvgSpend;
  // Already at or below zero and still losing money: it's gone now, not in
  // some fractional month's time.
  if (depletionMonth === null && currentSavings <= 0 && monthlyNet < 0) {
    depletionMonth = 0;
  }

  return {
    points,
    depletionMonth,
    // Depleting means the balance actually runs out inside the window, or
    // it's heading down from here.
    isDepleting: depletionMonth !== null || monthlyNet < 0,
    monthlyNet,
  };
}
