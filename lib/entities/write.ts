/**
 * What every entity write module shares: the shape of a result, the pages a
 * change has to refresh, and the one place a database error becomes a message.
 *
 * Each entity (transaction, income source, category, profile) has a module
 * that owns its writes end to end: validate, write, map the database's
 * answer, and say which pages the change touches. The server actions are
 * adapters over them and don't repeat any of it. The modules take the
 * client and the user id as arguments, so they run against the fixture
 * client in tests without mocking the session or `next/cache`.
 */

import type { createClient } from "@/lib/supabase/server";
import { CATEGORY_UNAVAILABLE_MESSAGE } from "@/lib/supabase/categories";
import { logAndFail } from "@/lib/utils/errors";

export type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * A page a write makes stale. `path` is a route as `revalidatePath` takes
 * it; a dynamic segment is named by its pattern with `type: "page"`.
 */
export interface Refresh {
  path: string;
  type?: "page" | "layout";
}

export type WriteResult =
  | { ok: true; refresh: Refresh[] }
  | { ok: false; error: string };

export const NOT_SIGNED_IN = "You're not signed in.";

/** Where the data each page draws on comes from, in one place. */
export const PAGES = {
  dashboard: { path: "/dashboard" },
  transactions: { path: "/transactions" },
  newTransaction: { path: "/transactions/new" },
  // The edit form lists categories and shows the row being edited.
  editTransaction: { path: "/transactions/[id]/edit", type: "page" },
  settings: { path: "/settings" },
} as const satisfies Record<string, Refresh>;

export function ok(...refresh: Refresh[]): WriteResult {
  return { ok: true, refresh };
}

export function fail(error: string): WriteResult {
  return { ok: false, error };
}

/** The part of a Supabase/Postgres error the mapping reads. */
interface DbError {
  code?: string;
  message?: string;
}

/** What an entity says when the database turns a write down for a known reason. */
export interface WriteMessages {
  /** A unique constraint (23505) failed. */
  duplicate?: string;
  /** The per-user row cap from migration 008 was hit. */
  rowLimit?: string;
}

/**
 * The user-facing message for a database error we recognise, or null.
 *
 * Postgres reports three different rejections from migration 008 with the
 * same code (23514, check_violation): the row-cap trigger, the
 * category-ownership trigger and the length/range CHECK constraints. The
 * code alone can't tell them apart, so the trigger messages are matched by
 * text. That text lives in the migration, and a drift test would be the
 * place to pin it.
 */
export function knownDbError(
  error: DbError,
  messages: WriteMessages = {}
): string | null {
  if (error.code === "23505" && messages.duplicate) return messages.duplicate;
  if (error.code === "23514") {
    const text = error.message ?? "";
    if (text.startsWith("row limit reached") && messages.rowLimit) {
      return messages.rowLimit;
    }
    if (text.startsWith("category is not available")) {
      return CATEGORY_UNAVAILABLE_MESSAGE;
    }
  }
  return null;
}

/**
 * Turn a failed write into a result: a known rejection becomes its message,
 * anything else is logged for the server log and reported as the generic one.
 */
export function failDb(
  action: string,
  error: DbError,
  messages: WriteMessages = {}
): WriteResult {
  const known = knownDbError(error, messages);
  if (known) return fail(known);
  return { ok: false, ...logAndFail(action, error) };
}
