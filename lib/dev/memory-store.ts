/**
 * An in-memory store that behaves like the database behind the real one.
 *
 * It backs the dev fixtures and the tests, and it holds itself to the rules
 * the migrations enforce, so a flow that works here can't be one the real
 * database would turn down:
 *
 *  - a category name is unique per user, compared exactly (not case-folded);
 *  - each user has at most MAX_TRANSACTIONS / MAX_INCOME_SOURCES /
 *    MAX_CATEGORIES rows, checked before anything else on an insert;
 *  - an expense can only use a preset or the writer's own category, and
 *    deleting a category leaves its expenses uncategorised;
 *  - the amount, length, date-order and recurrence CHECKs;
 *  - a write for someone other than the signed-in user is refused, the way
 *    row-level security refuses it;
 *  - removing a row that isn't there succeeds, and a read that fails comes
 *    back as an error, the two things the old query emulation got wrong.
 *
 * Which of those is which constraint is written next to each check. The
 * numbers come from lib/utils/limits.ts, and migrations-drift.test.ts keeps
 * that file and the migrations in step, so this store follows the SQL by
 * way of it.
 */

import type { IncomeFields, IncomeSource } from "@/lib/utils/income";
import { INCOME_RECURRENCE_OPTIONS } from "@/lib/utils/income";
import {
  MAX_AMOUNT,
  MAX_CATEGORIES,
  MAX_DESCRIPTION_LENGTH,
  MAX_INCOME_NAME_LENGTH,
  MAX_INCOME_SOURCES,
  MAX_MERCHANT_LENGTH,
  MAX_TRANSACTIONS,
  roundToCents,
} from "@/lib/utils/limits";
import { isRecurrence } from "@/lib/utils/recurrence";
import type { TransactionFields } from "@/lib/utils/transaction-input";
import {
  stored,
  storeFailed,
  type CategoryRecord,
  type ProfileRecord,
  type Store,
  type StoreResult,
  type TransactionRecord,
} from "@/lib/store/types";

// ---------------------------------------------------------------- row shapes

export interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  color: string;
  icon: string;
  is_preset: boolean;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  merchant: string | null;
  category_id: string | null;
  date: string;
  recurrence: string;
  created_at: string;
}

export interface IncomeSourceRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  recurrence: string;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
}

// No monthly_salary: the app reads income from income_sources now.
export interface ProfileRow {
  id: string;
  savings_balance: number;
  onboarded: boolean;
}

/** Everything the store holds. Mutated in place, so callers can seed and inspect it. */
export interface MemoryData {
  /** Null models the sign-up trigger never having made a profile row. */
  profile: ProfileRow | null;
  categories: CategoryRow[];
  transactions: TransactionRow[];
  incomeSources: IncomeSourceRow[];
}

export interface MemoryOptions {
  /** The signed-in user. Reads are scoped to them and writes must be theirs. */
  viewerId: string;
  data: MemoryData;
  /** How every read fails, if it does. "throw" is a dropped connection. */
  failReads?: "error" | "throw";
  /** Every write fails. */
  failWrites?: boolean;
  /** Pretend latency in ms, so loading states can be seen. */
  latencyMs?: number;
}

const READ_FAILURE = {
  message: "Fixture mode: simulated database read failure.",
  code: "FX503",
};
const WRITE_FAILURE = {
  message: "Fixture mode: simulated database failure.",
  code: "FX500",
};

let sequence = 0;
let lastCreated = 0;

/** Strictly increasing, so "newest first" has an answer for rows made in the same millisecond. */
function createdNow(): string {
  lastCreated = Math.max(Date.now(), lastCreated + 1);
  return new Date(lastCreated).toISOString();
}

function failed(cause: unknown): StoreResult<never> {
  return storeFailed({ kind: "failed", cause });
}

function violates(constraint: string): StoreResult<never> {
  return failed({
    code: "23514",
    message: `new row violates check constraint "${constraint}"`,
  });
}

/** numeric(_, 2) rounds what it is given. */
const cents = roundToCents;

function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

export function createMemoryStore(options: MemoryOptions): Store {
  const { viewerId, data } = options;

  async function pause(): Promise<void> {
    if (options.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, options.latencyMs));
    }
  }

  /** Run a read. Faults come first, as they would from a database that is down. */
  async function read<T>(run: () => T): Promise<StoreResult<T>> {
    await pause();
    if (options.failReads === "throw") {
      throw new Error("[tally fixtures] simulated database failure on read");
    }
    if (options.failReads === "error") return failed(READ_FAILURE);
    return stored(run());
  }

  /** Run a write for `userId`. Returns the store error to report, or the value. */
  async function write<T>(
    userId: string,
    run: () => StoreResult<T>
  ): Promise<StoreResult<T>> {
    await pause();
    if (options.failWrites) return failed(WRITE_FAILURE);
    // Row-level security: the insert/update policies need auth.uid() = user_id.
    if (userId !== viewerId) {
      return failed({ code: "42501", message: "new row violates row-level security policy" });
    }
    return run();
  }

  // What the signed-in user can see of the categories table (RLS).
  const visibleCategory = (c: CategoryRow) => c.is_preset || c.user_id === viewerId;

  function categoryRecord(c: CategoryRow): CategoryRecord {
    return {
      id: c.id,
      user_id: c.user_id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      is_preset: c.is_preset,
    };
  }

  function transactionRecord(t: TransactionRow): TransactionRecord {
    // The embed goes through RLS too: a category the viewer can't see is null.
    const category = data.categories.find((c) => c.id === t.category_id);
    return {
      id: t.id,
      amount: t.amount,
      description: t.description,
      merchant: t.merchant,
      date: t.date,
      recurrence: t.recurrence,
      category_id: t.category_id,
      category:
        category && visibleCategory(category)
          ? {
              id: category.id,
              name: category.name,
              icon: category.icon,
              color: category.color,
            }
          : null,
    };
  }

  const mine = <T extends { user_id: string }>(rows: T[]) =>
    rows.filter((row) => row.user_id === viewerId);

  const newestFirst = (a: TransactionRow, b: TransactionRow) =>
    a.date !== b.date
      ? a.date < b.date ? 1 : -1
      : a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;

  /** transactions_category_ownership: a preset, or one of the writer's own. */
  function categoryUsable(userId: string, categoryId: string | null): boolean {
    if (categoryId === null) return true;
    const category = data.categories.find((c) => c.id === categoryId);
    return !!category && visibleCategory(category) && (category.is_preset || category.user_id === userId);
  }

  /** transactions_amount_range, _description_length, _merchant_length and 005's recurrence. */
  function transactionViolation(f: TransactionFields): StoreResult<never> | null {
    if (!(f.amount > 0 && f.amount <= MAX_AMOUNT)) return violates("transactions_amount_range");
    if (f.description !== null && f.description.length > MAX_DESCRIPTION_LENGTH) {
      return violates("transactions_description_length");
    }
    if (f.merchant !== null && f.merchant.length > MAX_MERCHANT_LENGTH) {
      return violates("transactions_merchant_length");
    }
    if (!isRecurrence(f.recurrence)) return violates("transactions_recurrence_check");
    return null;
  }

  function incomeViolation(f: IncomeFields): StoreResult<never> | null {
    if (!(f.amount > 0)) return violates("income_sources_amount_check");
    if (f.amount > MAX_AMOUNT) return violates("income_sources_amount_max");
    if (f.name.length > MAX_INCOME_NAME_LENGTH) return violates("income_sources_name_length");
    if (!INCOME_RECURRENCE_OPTIONS.some((o) => o.value === f.recurrence)) {
      return violates("income_sources_recurrence_check");
    }
    if (f.starts_on && f.ends_on && f.ends_on < f.starts_on) {
      return violates("income_sources_dates_ordered");
    }
    return null;
  }

  const savingsViolation = (savings: number) =>
    savings >= 0 && savings <= MAX_AMOUNT ? null : violates("profiles_savings_balance_range");

  const rowLimit = (): StoreResult<never> => storeFailed({ kind: "row-limit" });

  return {
    profiles: {
      get: (userId) =>
        read((): ProfileRecord | null => {
          const profile = data.profile;
          if (!profile || profile.id !== viewerId || profile.id !== userId) return null;
          return { savings_balance: profile.savings_balance, onboarded: profile.onboarded };
        }),

      setSavings: (userId, savings) =>
        write(userId, () => {
          const bad = savingsViolation(savings);
          if (bad) return bad;
          // Like an UPDATE: a missing row is zero rows changed, not an error.
          if (data.profile && data.profile.id === userId) {
            data.profile.savings_balance = cents(savings);
          }
          return stored(undefined);
        }),

      markOnboarded: (userId, savings) =>
        write(userId, () => {
          const bad = savingsViolation(savings);
          if (bad) return bad;
          const profile = data.profile;
          if (!profile || profile.id !== userId || profile.onboarded) return stored(false);
          profile.savings_balance = cents(savings);
          profile.onboarded = true;
          return stored(true);
        }),

      createOnboarded: (userId, savings) =>
        write(userId, () => {
          const bad = savingsViolation(savings);
          if (bad) return bad;
          // The primary key is the user id.
          if (data.profile && data.profile.id === userId) {
            return storeFailed({ kind: "duplicate" });
          }
          data.profile = { id: userId, savings_balance: cents(savings), onboarded: true };
          return stored(undefined);
        }),
    },

    incomeSources: {
      list: () =>
        read((): IncomeSource[] =>
          mine(data.incomeSources)
            .sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0))
            .map((s) => ({
              id: s.id,
              name: s.name,
              amount: s.amount,
              recurrence: s.recurrence,
              starts_on: s.starts_on,
              ends_on: s.ends_on,
            }))
        ),

      add: (userId, fields) =>
        write(userId, () => {
          // The row-cap trigger runs before the CHECKs.
          if (mine(data.incomeSources).length >= MAX_INCOME_SOURCES) return rowLimit();
          const bad = incomeViolation(fields);
          if (bad) return bad;
          data.incomeSources.push({
            id: `mem-inc-${++sequence}`,
            user_id: userId,
            ...fields,
            amount: cents(fields.amount),
            created_at: createdNow(),
          });
          return stored(undefined);
        }),

      remove: (userId, id) =>
        write(userId, () => {
          data.incomeSources = data.incomeSources.filter(
            (s) => !(s.id === id && s.user_id === userId)
          );
          return stored(undefined);
        }),
    },

    categories: {
      listVisible: () =>
        read(() =>
          data.categories
            .filter(visibleCategory)
            .sort((a, b) =>
              a.is_preset !== b.is_preset ? (a.is_preset ? -1 : 1) : byName(a, b)
            )
            .map(categoryRecord)
        ),

      listCustom: (userId) =>
        read(() =>
          data.categories
            .filter((c) => !c.is_preset && c.user_id === userId && visibleCategory(c))
            .sort(byName)
            .map(categoryRecord)
        ),

      find: (id) =>
        read(() => {
          const category = data.categories.find((c) => c.id === id);
          return category && visibleCategory(category) ? categoryRecord(category) : null;
        }),

      add: (userId, fields) =>
        write(userId, () => {
          if (data.categories.filter((c) => c.user_id === userId).length >= MAX_CATEGORIES) {
            return rowLimit();
          }
          // categories_name_length is a looser backstop than the app's 32.
          if (fields.name.length > 50) return violates("categories_name_length");
          // unique (user_id, name), compared exactly like Postgres does.
          if (data.categories.some((c) => c.user_id === userId && c.name === fields.name)) {
            return storeFailed({ kind: "duplicate" });
          }
          data.categories.push({
            id: `mem-cat-${++sequence}`,
            user_id: userId,
            name: fields.name,
            color: fields.color,
            icon: "tag",
            is_preset: false,
            created_at: createdNow(),
          });
          return stored(undefined);
        }),

      remove: (userId, id) =>
        write(userId, () => {
          data.categories = data.categories.filter(
            (c) => !(c.id === id && c.user_id === userId && !c.is_preset)
          );
          // ON DELETE SET NULL on transactions.category_id.
          const live = new Set(data.categories.map((c) => c.id));
          for (const t of data.transactions) {
            if (t.category_id && !live.has(t.category_id)) t.category_id = null;
          }
          return stored(undefined);
        }),
    },

    transactions: {
      listAll: () =>
        read(() => mine(data.transactions).sort(newestFirst).map(transactionRecord)),

      listSince: (day) =>
        read(() =>
          mine(data.transactions)
            .filter((t) => t.date >= day)
            .map(transactionRecord)
        ),

      listRecurring: () =>
        read(() =>
          mine(data.transactions)
            .filter((t) => t.recurrence !== "once")
            .sort(newestFirst)
            .map(transactionRecord)
        ),

      listRecent: (count) =>
        read(() =>
          mine(data.transactions).sort(newestFirst).slice(0, count).map(transactionRecord)
        ),

      get: (userId, id) =>
        read(() => {
          const row = mine(data.transactions).find((t) => t.id === id && t.user_id === userId);
          return row ? transactionRecord(row) : null;
        }),

      add: (userId, fields) =>
        write(userId, () => {
          // Triggers fire in name order: ownership, then the row cap, then CHECKs.
          if (!categoryUsable(userId, fields.category_id)) {
            return storeFailed({ kind: "category-unavailable" });
          }
          if (mine(data.transactions).length >= MAX_TRANSACTIONS) return rowLimit();
          const bad = transactionViolation(fields);
          if (bad) return bad;
          data.transactions.push({
            id: `mem-tx-${++sequence}`,
            user_id: userId,
            ...fields,
            amount: cents(fields.amount),
            created_at: createdNow(),
          });
          return stored(undefined);
        }),

      update: (userId, id, fields) =>
        write(userId, () => {
          const row = data.transactions.find((t) => t.id === id && t.user_id === userId);
          if (!row) return stored(false);
          // Nothing new to check unless the category changed.
          if (
            fields.category_id !== row.category_id &&
            !categoryUsable(userId, fields.category_id)
          ) {
            return storeFailed({ kind: "category-unavailable" });
          }
          const bad = transactionViolation(fields);
          if (bad) return bad;
          Object.assign(row, fields, { amount: cents(fields.amount) });
          return stored(true);
        }),

      remove: (userId, id) =>
        write(userId, () => {
          data.transactions = data.transactions.filter(
            (t) => !(t.id === id && t.user_id === userId)
          );
          return stored(undefined);
        }),
    },
  };
}
