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
export const MAX_AMOUNT_MESSAGE = "Amount must be 9,999,999,999.99 or less.";

/**
 * Money has two decimal places. Round before comparing to MAX_AMOUNT, not
 * after: 9_999_999_999.999 is over the cap as typed but rounds to 10 billion,
 * which numeric(12, 2) can't hold, and 9_999_999_999.994 is fine once rounded.
 */
export function roundToCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export const MAX_DESCRIPTION_LENGTH = 200;
export const MAX_MERCHANT_LENGTH = 100;
export const MAX_INCOME_NAME_LENGTH = 100;
