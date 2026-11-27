/**
 * The store over Supabase: every PostgREST query the app makes, in one file.
 *
 * Two jobs the callers no longer do. It narrows rows, since the client isn't
 * typed against the schema, and it turns Postgres' errors into the store's
 * (`toStoreError`). A write that matches nothing is not an error here, the
 * way it isn't in Postgres; the methods that need to know say so in their
 * result.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IncomeFields, IncomeSource } from "@/lib/utils/income";
import type { TransactionFields } from "@/lib/utils/transaction-input";
import {
  stored,
  storeFailed,
  type CategoryRecord,
  type CategoryRef,
  type ProfileRecord,
  type Store,
  type StoreError,
  type StoreResult,
  type TransactionRecord,
} from "./types";

interface DbError {
  code?: string;
  message?: string;
}

/**
 * Postgres reports three different rejections from migration 008 with the
 * same code (23514, check_violation): the row-cap trigger, the
 * category-ownership trigger and the length/range CHECK constraints. The code
 * alone can't tell them apart, so the two triggers are matched by their
 * message text, which lib/utils/migrations-drift.test.ts keeps honest.
 */
export function toStoreError(error: DbError): StoreError {
  if (error.code === "23505") return { kind: "duplicate" };
  if (error.code === "23514") {
    const text = error.message ?? "";
    if (text.startsWith("row limit reached")) return { kind: "row-limit" };
    if (text.startsWith("category is not available")) {
      return { kind: "category-unavailable" };
    }
  }
  return { kind: "failed", cause: error };
}

function failure(error: DbError): StoreResult<never> {
  return storeFailed(toStoreError(error));
}

const CATEGORY_JOIN = "category:categories(id, name, icon, color)";
const TRANSACTION_COLUMNS = `id, amount, description, merchant, date, recurrence, ends_on, category_id, ${CATEGORY_JOIN}`;
const CATEGORY_COLUMNS = "id, user_id, name, icon, color, is_preset";
const INCOME_COLUMNS = "id, name, amount, recurrence, starts_on, ends_on";

// Supabase's usual `max_rows` is 1000. Pages stop on a short page, so a
// project that caps lower than this would need PAGE_SIZE lowered to match.
const PAGE_SIZE = 1000;
// The row cap is 10,000 per user; the extra page is slack, not a feature.
const MAX_PAGES = 11;

export function createSupabaseStore(client: SupabaseClient): Store {
  /** Run a query that returns a list of rows and narrow each. */
  async function rows<T>(
    query: PromiseLike<{ data: unknown; error: DbError | null }>,
    narrow: (row: Row) => T
  ): Promise<StoreResult<T[]>> {
    const { data, error } = await query;
    if (error) return failure(error);
    return stored(Array.isArray(data) ? (data as Row[]).map(narrow) : []);
  }

  /**
   * Run a list query a page at a time until a short page comes back.
   *
   * PostgREST truncates a response at the project's `max_rows` with no
   * warning, and the per-user cap is 10,000 rows. `build` makes a fresh query
   * per page (a builder is spent once `range` is applied) and must order by
   * something unique so pages neither skip nor repeat a row.
   */
  async function pagedRows<T>(
    build: () => {
      range(from: number, to: number): PromiseLike<{ data: unknown; error: DbError | null }>;
    },
    narrow: (row: Row) => T
  ): Promise<StoreResult<T[]>> {
    const all: T[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const from = page * PAGE_SIZE;
      const result = await rows(build().range(from, from + PAGE_SIZE - 1), narrow);
      if (!result.ok) return result;
      all.push(...result.value);
      if (result.value.length < PAGE_SIZE) break;
    }
    return stored(all);
  }

  /** Run a write and report only whether it worked. */
  async function done(
    query: PromiseLike<{ error: DbError | null }>
  ): Promise<StoreResult<void>> {
    const { error } = await query;
    return error ? failure(error) : stored(undefined);
  }

  return {
    profiles: {
      async get(userId) {
        const { data, error } = await client
          .from("profiles")
          .select("savings_balance, onboarded")
          .eq("id", userId)
          .maybeSingle();
        if (error) return failure(error);
        return stored(data ? toProfile(data as Row) : null);
      },
      setSavings(userId, savings) {
        return done(
          client.from("profiles").update({ savings_balance: savings }).eq("id", userId)
        );
      },
      async markOnboarded(userId, savings) {
        // Postgres re-checks the WHERE after waiting on the row lock, so of
        // two parallel calls only one sees onboarded = false and gets a row.
        const { data, error } = await client
          .from("profiles")
          .update({ savings_balance: savings, onboarded: true })
          .eq("id", userId)
          .eq("onboarded", false)
          .select("id");
        if (error) return failure(error);
        return stored(Array.isArray(data) && data.length > 0);
      },
      createOnboarded(userId, savings) {
        return done(
          client
            .from("profiles")
            .insert({ id: userId, savings_balance: savings, onboarded: true })
        );
      },
    },

    incomeSources: {
      list() {
        return rows(
          client
            .from("income_sources")
            .select(INCOME_COLUMNS)
            .order("created_at", { ascending: true }),
          toIncomeSource
        );
      },
      add(userId, fields: IncomeFields) {
        return done(client.from("income_sources").insert({ user_id: userId, ...fields }));
      },
      remove(userId, id) {
        // RLS is the real boundary; the explicit user_id filter states the intent.
        return done(
          client.from("income_sources").delete().eq("id", id).eq("user_id", userId)
        );
      },
    },

    categories: {
      listVisible() {
        return rows(
          client
            .from("categories")
            .select(CATEGORY_COLUMNS)
            .order("is_preset", { ascending: false })
            .order("name", { ascending: true }),
          toCategoryRecord
        );
      },
      listCustom(userId) {
        return rows(
          client
            .from("categories")
            .select(CATEGORY_COLUMNS)
            .eq("user_id", userId)
            .eq("is_preset", false)
            .order("name", { ascending: true }),
          toCategoryRecord
        );
      },
      async find(id) {
        const { data, error } = await client
          .from("categories")
          .select(CATEGORY_COLUMNS)
          .eq("id", id)
          .maybeSingle();
        if (error) return failure(error);
        return stored(data ? toCategoryRecord(data as Row) : null);
      },
      add(userId, fields) {
        return done(
          client.from("categories").insert({
            user_id: userId,
            ...fields,
            icon: "tag",
            is_preset: false,
          })
        );
      },
      remove(userId, id) {
        // Presets are protected by RLS as well; is_preset = false states it.
        return done(
          client
            .from("categories")
            .delete()
            .eq("id", id)
            .eq("user_id", userId)
            .eq("is_preset", false)
        );
      },
    },

    transactions: {
      listAll() {
        return pagedRows(
          () =>
            client
              .from("transactions")
              .select(TRANSACTION_COLUMNS)
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id", { ascending: false }),
          toTransaction
        );
      },
      listSince(day) {
        return pagedRows(
          () =>
            client
              .from("transactions")
              .select(TRANSACTION_COLUMNS)
              .gte("date", day)
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id", { ascending: false }),
          toTransaction
        );
      },
      listRecurring() {
        return pagedRows(
          () =>
            client
              .from("transactions")
              .select(TRANSACTION_COLUMNS)
              .neq("recurrence", "once")
              .order("date", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id", { ascending: false }),
          toTransaction
        );
      },
      listRecent(count) {
        return rows(
          client
            .from("transactions")
            .select(TRANSACTION_COLUMNS)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(count),
          toTransaction
        );
      },
      async get(userId, id) {
        const { data, error } = await client
          .from("transactions")
          .select(TRANSACTION_COLUMNS)
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) return failure(error);
        return stored(data ? toTransaction(data as Row) : null);
      },
      add(userId, fields: TransactionFields) {
        return done(client.from("transactions").insert({ user_id: userId, ...fields }));
      },
      async update(userId, id, fields: TransactionFields) {
        // Without .select() a wrong id would report success against zero rows.
        const { data, error } = await client
          .from("transactions")
          // A one-off has nothing to end (transactions_ends_on_check).
          .update(fields.recurrence === "once" ? { ...fields, ends_on: null } : fields)
          .eq("id", id)
          .eq("user_id", userId)
          .select("id");
        if (error) return failure(error);
        return stored(Array.isArray(data) && data.length > 0);
      },
      async setEndsOn(userId, id, day) {
        const { data, error } = await client
          .from("transactions")
          .update({ ends_on: day })
          .eq("id", id)
          .eq("user_id", userId)
          .neq("recurrence", "once")
          .select("id");
        if (error) return failure(error);
        return stored(Array.isArray(data) && data.length > 0);
      },
      retag(userId, ids, fields) {
        if (ids.length === 0) return Promise.resolve(stored(undefined));
        return done(
          client
            .from("transactions")
            .update({
              category_id: fields.category_id,
              merchant: fields.merchant,
              recurrence: fields.recurrence,
              ...(fields.recurrence === "once" ? { ends_on: null } : {}),
            })
            .in("id", ids)
            .eq("user_id", userId)
        );
      },
      remove(userId, id) {
        return done(
          client.from("transactions").delete().eq("id", id).eq("user_id", userId)
        );
      },
    },
  };
}

// ------------------------------------------------------------- row narrowing

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * A joined `category` is one row through a single foreign key, but PostgREST's
 * typings describe it as an array and some responses really do wrap it. Take
 * the first either way.
 */
function toCategoryRef(value: unknown): CategoryRef | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Row;
  if (typeof c.id !== "string") return null;
  return {
    id: c.id,
    name: text(c.name) ?? "",
    icon: text(c.icon) ?? "tag",
    color: text(c.color) ?? "#9CA3AF",
  };
}

function toCategoryRecord(row: Row): CategoryRecord {
  return {
    id: String(row.id),
    user_id: text(row.user_id),
    name: String(row.name),
    icon: text(row.icon) ?? "tag",
    color: text(row.color) ?? "#9CA3AF",
    is_preset: row.is_preset === true,
  };
}

function toTransaction(row: Row): TransactionRecord {
  return {
    id: String(row.id),
    amount: Number(row.amount),
    description: text(row.description),
    merchant: text(row.merchant),
    date: String(row.date),
    recurrence: text(row.recurrence) ?? "once",
    ends_on: text(row.ends_on),
    category_id: text(row.category_id),
    category: toCategoryRef(row.category),
  };
}

function toIncomeSource(row: Row): IncomeSource {
  return {
    id: String(row.id),
    name: String(row.name),
    amount: Number(row.amount),
    recurrence: String(row.recurrence),
    starts_on: text(row.starts_on),
    ends_on: text(row.ends_on),
  };
}

function toProfile(row: Row): ProfileRecord {
  return {
    savings_balance: Number(row.savings_balance),
    onboarded: row.onboarded === true,
  };
}
