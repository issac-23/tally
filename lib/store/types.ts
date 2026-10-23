/**
 * The store: every read and write the app makes, as one interface.
 *
 * The domain modules (the financial picture, the entity writes) and the
 * pages used to talk to Supabase's query builder directly, so the dev
 * fixtures had to impersonate PostgREST: parse `category:categories(...)`
 * out of a select string, mimic its error codes, answer `.eq().gte().order()`.
 * That emulation was the seam, and it was the wrong shape: the fixture could
 * only be as faithful as the part of PostgREST it re-implemented, and it
 * drifted.
 *
 * The seam now sits here. There are two adapters. The Supabase adapter
 * (supabase-store.ts) speaks PostgREST and turns Postgres' answers into the
 * results below. The in-memory adapter (lib/dev/memory-store.ts) is a plain
 * store that enforces the same rules the migrations do, and backs the dev
 * fixtures and the tests. Neither leaks into the callers: a duplicate name is
 * `{ kind: "duplicate" }`, not a code to look up.
 *
 * Row-level security scopes every read to the signed-in user, so reads take
 * no user id; writes name the user, as the explicit filters always did.
 */

import type { IncomeFields, IncomeSource } from "@/lib/utils/income";
import type { TransactionFields } from "@/lib/utils/transaction-input";

export interface CategoryRef {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CategoryRecord extends CategoryRef {
  /** Null for a preset. */
  user_id: string | null;
  is_preset: boolean;
}

/** An expense, with its category joined on. */
export interface TransactionRecord {
  id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  date: string; // YYYY-MM-DD
  recurrence: string;
  category_id: string | null;
  category: CategoryRef | null;
}

export interface ProfileRecord {
  savings_balance: number;
  onboarded: boolean;
}

/** Why a store call failed, in the store's terms and not Postgres'. */
export type StoreError =
  /** A unique constraint: a category name twice, a second profile row. */
  | { kind: "duplicate" }
  /** The per-user row cap on that table (migration 008). */
  | { kind: "row-limit" }
  /** An expense filed under a category its owner may not use (migration 008). */
  | { kind: "category-unavailable" }
  /** Anything else: a dropped connection, RLS, a CHECK constraint. Not for users. */
  | { kind: "failed"; cause: unknown };

export type StoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: StoreError };

export interface Store {
  profiles: {
    /** Null when the user has no profile row. */
    get(userId: string): Promise<StoreResult<ProfileRecord | null>>;
    setSavings(userId: string, savings: number): Promise<StoreResult<void>>;
    /**
     * Set the balance and flip `onboarded`, but only if it isn't already set,
     * as one conditional update so two parallel calls can't both win. True
     * when this call was the one that flipped it.
     */
    markOnboarded(userId: string, savings: number): Promise<StoreResult<boolean>>;
    /** Insert an onboarded profile. A `duplicate` means one already exists. */
    createOnboarded(userId: string, savings: number): Promise<StoreResult<void>>;
  };

  incomeSources: {
    /** Every source, oldest first. */
    list(): Promise<StoreResult<IncomeSource[]>>;
    add(userId: string, fields: IncomeFields): Promise<StoreResult<void>>;
    /** Removing a source that isn't there is not an error. */
    remove(userId: string, id: string): Promise<StoreResult<void>>;
  };

  categories: {
    /** Presets and the user's own, presets first, then by name. */
    listVisible(): Promise<StoreResult<CategoryRecord[]>>;
    /** Only the user's own, by name. */
    listCustom(userId: string): Promise<StoreResult<CategoryRecord[]>>;
    find(id: string): Promise<StoreResult<CategoryRecord | null>>;
    add(
      userId: string,
      fields: { name: string; color: string }
    ): Promise<StoreResult<void>>;
    /** Custom categories only; expenses in it fall back to uncategorised. */
    remove(userId: string, id: string): Promise<StoreResult<void>>;
  };

  transactions: {
    /** Newest first. */
    listAll(): Promise<StoreResult<TransactionRecord[]>>;
    /** Dated on or after `day`, in no particular order. */
    listSince(day: string): Promise<StoreResult<TransactionRecord[]>>;
    /** Every standing commitment, however long ago it was logged, newest first. */
    listRecurring(): Promise<StoreResult<TransactionRecord[]>>;
    listRecent(count: number): Promise<StoreResult<TransactionRecord[]>>;
    get(userId: string, id: string): Promise<StoreResult<TransactionRecord | null>>;
    add(userId: string, fields: TransactionFields): Promise<StoreResult<void>>;
    /** False when no expense of the user's has that id. */
    update(
      userId: string,
      id: string,
      fields: TransactionFields
    ): Promise<StoreResult<boolean>>;
    /** Removing an expense that isn't there is not an error. */
    remove(userId: string, id: string): Promise<StoreResult<void>>;
  };
}

export function stored<T>(value: T): StoreResult<T> {
  return { ok: true, value };
}

export function storeFailed(error: StoreError): StoreResult<never> {
  return { ok: false, error };
}

/**
 * The value, or throw. For a page, where a failed read goes to the error
 * boundary and not to an empty state that looks like real data.
 */
export function orThrow<T>(result: StoreResult<T>): T {
  if (result.ok) return result.value;
  const { error } = result;
  throw new Error(
    error.kind === "failed" ? "A database read failed." : `A database read failed: ${error.kind}.`,
    { cause: error.kind === "failed" ? error.cause : undefined }
  );
}
