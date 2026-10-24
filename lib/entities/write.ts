/**
 * What every entity write module shares: the shape of a result, the pages a
 * change has to refresh, and the one place a store error becomes a message.
 *
 * Each entity (transaction, income source, category, profile) has a module
 * that owns its writes end to end: validate, write, map the store's answer,
 * and say which pages the change touches. The server actions are adapters
 * over them and don't repeat any of it. The modules take the store and the
 * user id as arguments, so they run against the in-memory store in tests
 * without mocking the session or `next/cache`.
 */

import type { Store, StoreError } from "@/lib/store/types";
import { CATEGORY_UNAVAILABLE_MESSAGE } from "./category-access";
import { logAndFail } from "@/lib/utils/errors";

export type { Store };

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

/** What an entity says when the store turns a write down for a known reason. */
export interface WriteMessages {
  /** A unique constraint failed. */
  duplicate?: string;
  /** The per-user row cap was hit. */
  rowLimit?: string;
}

/**
 * Turn a store error into a result: a rejection the user can act on becomes
 * its message, anything else is logged for the server log and reported as the
 * generic one.
 */
export function failStore(
  action: string,
  error: StoreError,
  messages: WriteMessages = {}
): WriteResult {
  if (error.kind === "duplicate" && messages.duplicate) return fail(messages.duplicate);
  if (error.kind === "row-limit" && messages.rowLimit) return fail(messages.rowLimit);
  if (error.kind === "category-unavailable") return fail(CATEGORY_UNAVAILABLE_MESSAGE);
  return { ok: false, ...logAndFail(action, error.kind === "failed" ? error.cause : error) };
}
