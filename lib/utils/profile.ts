/**
 * Validate the financial inputs that go into a user's profile.
 * Returns null when the inputs are good, or an error message otherwise.
 *
 * The DB has CHECK constraints as a backstop, but catching it here gives
 * a friendlier message than a raw Postgres error.
 */
export function validateProfileInput(
  savingsBalance: number,
  monthlySalary: number
): string | null {
  if (
    !Number.isFinite(savingsBalance) ||
    !Number.isFinite(monthlySalary)
  ) {
    return "Please enter valid numbers.";
  }
  if (savingsBalance < 0 || monthlySalary < 0) {
    return "Amounts can't be negative.";
  }
  return null;
}
