import type { RunwayInfo, RunwayStatus } from "@/types";

/**
 * Months of runway thresholds.
 * Adjust these and the whole app's color logic moves with it.
 */
const RUNWAY_THRESHOLDS = {
  GREEN_MIN: 6, // 6+ months → green
  YELLOW_MIN: 3, // 3-6 months → yellow
  ORANGE_MIN: 1, // 1-3 months → orange
  // < 1 month → red
} as const;

/**
 * How many months we want savings to last as a baseline.
 * Used to compute a "sustainable" monthly budget limit.
 */
const TARGET_RUNWAY_MONTHS = 12;

/**
 * Determine the status color based on months remaining.
 */
export function runwayStatus(monthsRemaining: number): RunwayStatus {
  if (monthsRemaining >= RUNWAY_THRESHOLDS.GREEN_MIN) return "green";
  if (monthsRemaining >= RUNWAY_THRESHOLDS.YELLOW_MIN) return "yellow";
  if (monthsRemaining >= RUNWAY_THRESHOLDS.ORANGE_MIN) return "orange";
  return "red";
}

/**
 * Human-readable label for the runway.
 */
export function runwayLabel(monthsRemaining: number): string {
  if (!isFinite(monthsRemaining)) return "Indefinite, you're saving";
  if (monthsRemaining < 1) {
    const days = Math.max(0, Math.round(monthsRemaining * 30));
    return `~${days} day${days === 1 ? "" : "s"} left`;
  }
  const rounded = Math.round(monthsRemaining * 10) / 10;
  return `~${rounded} month${rounded === 1 ? "" : "s"} left`;
}

/**
 * Recommended sustainable monthly spending limit.
 *
 * Formula: salary + (savings / TARGET_RUNWAY_MONTHS)
 * Meaning: if you spend up to this each month, your savings will last
 * at least TARGET_RUNWAY_MONTHS months even with no other changes.
 */
export function monthlyBudgetLimit(
  savingsBalance: number,
  monthlySalary: number
): number {
  return monthlySalary + savingsBalance / TARGET_RUNWAY_MONTHS;
}

/**
 * Core runway calculation.
 *
 * - If net cash flow is non-negative (earning ≥ spending) → infinite runway
 * - Otherwise → savings divided by monthly burn rate
 */
export function calculateRunway(
  savingsBalance: number,
  monthlySalary: number,
  monthlyAvgSpend: number
): RunwayInfo {
  const netMonthly = monthlySalary - monthlyAvgSpend;
  const burnRate = -netMonthly; // positive when overspending

  const monthsRemaining =
    burnRate <= 0 || savingsBalance <= 0
      ? burnRate <= 0
        ? Infinity
        : 0
      : savingsBalance / burnRate;

  return {
    months_remaining: monthsRemaining,
    status: runwayStatus(monthsRemaining),
    label: runwayLabel(monthsRemaining),
    monthly_budget_limit: monthlyBudgetLimit(savingsBalance, monthlySalary),
    monthly_avg_spend: monthlyAvgSpend,
  };
}
