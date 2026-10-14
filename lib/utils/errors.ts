/**
 * What a server action says when the database fails it, on a write or a read.
 *
 * Supabase errors name tables, columns and constraints. That's useful in the
 * server log and nowhere else, so the actions log the real error and hand
 * the user this instead. Messages written for validation stay as they are.
 */
export const GENERIC_ERROR = "Something went wrong. Try again in a moment.";

/**
 * Log the real error for the server log and return the generic one for the
 * user. Every action that hits a database failure does exactly this pair.
 */
export function logAndFail(action: string, error: unknown): { error: string } {
  console.error(`${action} failed:`, error);
  return { error: GENERIC_ERROR };
}
