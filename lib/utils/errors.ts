/**
 * What a server action says when the database refuses a write.
 *
 * Supabase errors name tables, columns and constraints. That's useful in the
 * server log and nowhere else, so the actions log the real error and hand
 * the user this instead. Messages written for validation stay as they are.
 */
export const GENERIC_ERROR = "Something went wrong. Try again in a moment.";
