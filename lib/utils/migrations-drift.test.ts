/**
 * The app checks input before it writes (lib/utils/limits.ts, recurrence.ts)
 * and the database checks it again (supabase/migrations). They are the same
 * rules written twice, in two languages, and nothing but this test notices
 * when one side moves: raise a limit in the app and the database quietly
 * keeps the old one, so users hit a raw constraint error where the form said
 * yes.
 *
 * This reads the migration files and compares the numbers and lists in them
 * with the constants the app uses.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { toStoreError } from "@/lib/store/supabase-store";
import { INCOME_RECURRENCE_OPTIONS } from "./income";
import {
  MAX_AMOUNT,
  MAX_CATEGORIES,
  MAX_CATEGORY_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_INCOME_NAME_LENGTH,
  MAX_INCOME_SOURCES,
  MAX_MERCHANT_LENGTH,
  MAX_TRANSACTIONS,
} from "./limits";
import { RECURRENCE_OPTIONS } from "./recurrence";

const DIR = path.resolve(__dirname, "../../supabase/migrations");

/** A migration's SQL with its `--` comments removed, so a number in prose can't match. */
function migration(prefix: string): string {
  const file = readdirSync(DIR).find((name) => name.startsWith(prefix));
  if (!file) throw new Error(`no migration starting with ${prefix}`);
  return readFileSync(path.join(DIR, file), "utf8")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

/** The first capture group of `pattern`, which must be there. */
function capture(sql: string, pattern: RegExp): string {
  const match = sql.match(pattern);
  if (!match) throw new Error(`migration no longer matches ${pattern}`);
  return match[1];
}

const sql008 = migration("008");

describe("migration 008 against lib/utils/limits.ts", () => {
  it("holds the same amount cap, which is what numeric(12, 2) can store", () => {
    // 10 integer digits and 2 decimals.
    expect(MAX_AMOUNT).toBe(10 ** 10 - 0.01);

    const range = capture(sql008, /transactions_amount_range\s+check \(amount > 0 and amount <= ([\d.]+)\)/);
    expect(Number(range)).toBe(MAX_AMOUNT);
    expect(Number(capture(sql008, /income_sources_amount_max\s+check \(amount <= ([\d.]+)\)/))).toBe(
      MAX_AMOUNT
    );
    expect(
      Number(
        capture(
          sql008,
          /profiles_savings_balance_range\s+check \(savings_balance >= 0 and savings_balance <= ([\d.]+)\)/
        )
      )
    ).toBe(MAX_AMOUNT);
  });

  it("holds the same text lengths", () => {
    const length = (column: string, constraint: string) =>
      Number(capture(sql008, new RegExp(`${constraint}\\s+check \\(char_length\\(${column}\\) <= (\\d+)\\)`)));

    expect(length("description", "transactions_description_length")).toBe(MAX_DESCRIPTION_LENGTH);
    expect(length("merchant", "transactions_merchant_length")).toBe(MAX_MERCHANT_LENGTH);
    expect(length("name", "income_sources_name_length")).toBe(MAX_INCOME_NAME_LENGTH);
  });

  it("lets a category name be at least as long as the app does", () => {
    // Deliberately not equal: the database's 50 is a backstop above the
    // app's 32, so the form can tighten without a migration. What must never
    // happen is the app accepting a name the database would turn down.
    const db = Number(
      capture(sql008, /categories_name_length\s+check \(char_length\(name\) <= (\d+)\)/)
    );
    expect(db).toBeGreaterThanOrEqual(MAX_CATEGORY_NAME_LENGTH);
  });

  it("holds the same per-user row caps", () => {
    const caps = new Map<string, number>();
    const trigger =
      /create trigger \w+\s+before insert on public\.(\w+)\s+for each row\s+execute function public\.enforce_row_cap\((\d+)\)/g;
    for (const [, table, cap] of sql008.matchAll(trigger)) caps.set(table, Number(cap));

    expect(Object.fromEntries(caps)).toEqual({
      transactions: MAX_TRANSACTIONS,
      income_sources: MAX_INCOME_SOURCES,
      categories: MAX_CATEGORIES,
    });
  });

  it("raises messages the store's error mapping still recognises", () => {
    const messages = Array.from(sql008.matchAll(/raise exception\s+'([^']+)'/g), (m) => m[1]);
    expect(messages).toHaveLength(2);

    // `%` placeholders are filled in by Postgres; the text before them is
    // what the mapping reads.
    const kinds = messages.map((m) =>
      toStoreError({
        code: "23514",
        message: m.replace("%", "transactions").replace("%", "10000"),
      }).kind
    );
    expect(kinds.sort()).toEqual(["category-unavailable", "row-limit"]);
  });
});

describe("recurrence lists against lib/utils/recurrence.ts", () => {
  /** The values inside `recurrence in ( ... )` of a migration. */
  function recurrenceList(sql: string): string[] {
    const list = capture(sql, /recurrence in \(([^)]*)\)/);
    return Array.from(list.matchAll(/'([^']+)'/g), (m) => m[1]);
  }

  it("lets transactions repeat in every way the app offers", () => {
    expect(recurrenceList(migration("005"))).toEqual(RECURRENCE_OPTIONS.map((o) => o.value));
  });

  it("lets income repeat in every way the app offers", () => {
    expect(recurrenceList(migration("006"))).toEqual(INCOME_RECURRENCE_OPTIONS.map((o) => o.value));
  });
});
