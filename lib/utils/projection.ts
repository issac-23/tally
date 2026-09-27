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
  /**
   * Index of the point in the window. 0 = today. One step is `periodMonths`
   * long, so with the default monthly step this is also months from now.
   */
  month: number;
  /** Projected balance at that point. Floored at 0 for display. */
  balance: number;
}

export interface SavingsProjection {
  points: ProjectionPoint[];
  /**
   * Exact (possibly fractional) month when the projection crosses zero.
   * Null when not depleting, or when depletion falls beyond the window.
   */
  depletionMonth: number | null;
  /**
   * Savings are heading down: either they run out inside the window, or
   * the balance ends it lower than it starts. With flat income that's just
   * "net flow is negative"; with income that stops partway it's the only
   * honest reading.
   */
  isDepleting: boolean;
  /** Cash flow in the current month: income - avg spend. */
  monthlyNet: number;
  /**
   * Where depletion falls on the points array, as a possibly-fractional
   * index. Same figure as `depletionMonth` under a monthly step; the chart
   * plots against indices, so it needs this one.
   */
  depletionIndex: number | null;
  /** Length of one step, in months. Echoed back so callers can label the axis. */
  periodMonths: number;
}

const DEFAULT_PROJECTION_MONTHS = 12;
const DAYS_PER_MONTH = 30.44;

export interface ProjectSavingsOptions {
  /** How many points to plot after "now". */
  periods?: number;
  /** Length of one step in months. 1 = monthly, 7/30.44 ≈ weekly. */
  periodMonths?: number;
}

export function projectSavings(
  currentSavings: number,
  /**
   * A flat monthly figure, or one entry per month when income changes
   * partway through — a contract ending, a raise starting. Short arrays
   * hold their last value for the rest of the window.
   */
  monthlyIncome: number | number[],
  monthlyAvgSpend: number,
  /** A plain month count, or a scale from `projectionScale`. */
  window: number | ProjectSavingsOptions = DEFAULT_PROJECTION_MONTHS
): SavingsProjection {
  const periods =
    typeof window === "number"
      ? window
      : window.periods ?? DEFAULT_PROJECTION_MONTHS;
  const periodMonths = typeof window === "number" ? 1 : window.periodMonths ?? 1;

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

  for (let p = 1; p <= periods; p++) {
    // The income schedule is indexed by calendar month whatever the step is,
    // so a sub-month step reads the same entry several times over.
    const elapsedMonths = (p - 1) * periodMonths;
    const net = (incomeIn(Math.floor(elapsedMonths)) - monthlyAvgSpend) * periodMonths;
    const next = balance + net;

    // Catch the crossing inside the step it happens in, and interpolate to
    // the fractional month rather than rounding to the boundary.
    if (depletionMonth === null && balance > 0 && next <= 0 && net < 0) {
      depletionMonth = (p - 1 + balance / -net) * periodMonths;
    }

    balance = next;
    points.push({ month: p, balance: Math.max(0, balance) });
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
    isDepleting:
      depletionMonth !== null || monthlyNet < 0 || balance < currentSavings,
    monthlyNet,
    depletionIndex: depletionMonth === null ? null : depletionMonth / periodMonths,
    periodMonths,
  };
}
