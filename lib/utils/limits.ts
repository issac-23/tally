/**
 * Size limits shared by the validators, the forms and migration 008.
 *
 * Nothing in the UI needs a 10,000-character merchant name, and without a
 * ceiling one signed-in user can fill rows with as much text as Postgres
 * will take. The database enforces the same numbers; these exist so the
 * user hears about it in words rather than as a constraint error.
 */

/** The largest value numeric(12, 2) can hold. */
export const MAX_AMOUNT = 9_999_999_999.99;
export const MAX_AMOUNT_MESSAGE = `Amount must be ${MAX_AMOUNT.toLocaleString("en-US", {
  minimumFractionDigits: 2,
})} or less.`;

/**
 * Money has two decimal places. Round before comparing to MAX_AMOUNT, not
 * after: 9_999_999_999.999 is over the cap as typed but rounds to 10 billion,
 * which numeric(12, 2) can't hold, and 9_999_999_999.994 is fine once rounded.
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** The amount in cents, or null when that is more than MAX_AMOUNT. */
export function roundWithinCap(amount: number): number | null {
  const rounded = roundToCents(amount);
  return rounded > MAX_AMOUNT ? null : rounded;
}

export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_MERCHANT_LENGTH = 100;
export const MAX_INCOME_NAME_LENGTH = 100;
export const MAX_CATEGORY_NAME_LENGTH = 32;

export function tooLongMessage(what: string, max: number): string {
  return `Keep the ${what} to ${max} characters or fewer.`;
}
