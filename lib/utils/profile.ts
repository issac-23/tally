import { balanceMoney } from "./fields";

/**
 * Validate the financial inputs that go into a user's profile.
 * Returns null when the inputs are good, or an error message otherwise.
 *
 * Migration 008 adds the same range as a CHECK constraint on
 * profiles.savings_balance; catching it here gives a friendlier message than
 * a raw Postgres error.
 */
export function validateProfileInput(savingsBalance: number): string | null {
  const balance = balanceMoney(savingsBalance);
  return balance.ok ? null : balance.error;
}
