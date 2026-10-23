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

/**
 * Text length as Postgres counts it: char_length() is code points, while
 * String#length is UTF-16 code units, so an emoji is 1 here and 2 there.
 * Every length check against the limits above goes through this so the app,
 * the in-memory store and the CHECK constraints agree.
 */
export function textLength(text: string): number {
  return [...text].length;
}

export function tooLongMessage(what: string, max: number): string {
  return `Keep the ${what} to ${max} characters or fewer.`;
}

/**
 * Per-user row caps, enforced by the triggers in migration 008. The database
 * is the real limit; the numbers are here so the user is told what it is.
 */
export const MAX_TRANSACTIONS = 10_000;
export const MAX_INCOME_SOURCES = 50;
export const MAX_CATEGORIES = 100;

export function rowLimitMessage(max: number, what: string): string {
  return `You've reached the limit of ${max.toLocaleString("en-US")} ${what}.`;
}
