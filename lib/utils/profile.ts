import { MAX_AMOUNT_MESSAGE, roundWithinCap } from "./limits";

/**
 * Validate the financial inputs that go into a user's profile.
 * Returns null when the inputs are good, or an error message otherwise.
 *
 * Migration 008 adds the same range as a CHECK constraint on
 * profiles.savings_balance; catching it here gives a friendlier message than
 * a raw Postgres error.
 */
export function validateProfileInput(savingsBalance: number): string | null {
  if (!Number.isFinite(savingsBalance)) {
    return "Please enter valid numbers.";
  }
  if (savingsBalance < 0) {
    return "Amounts can't be negative.";
  }
  if (roundWithinCap(savingsBalance) === null) {
    return MAX_AMOUNT_MESSAGE;
  }
  return null;
}
