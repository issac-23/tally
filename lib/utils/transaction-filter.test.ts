import { describe, it, expect } from "vitest";
import {
  EMPTY_FILTER,
  filterTransactions,
  isFilterActive,
} from "./transaction-filter";

const FOOD = { id: "cat-food", name: "Food & Drink" };
const SHOPPING = { id: "cat-shopping", name: "Shopping" };
const GROCERIES = { id: "cat-groceries", name: "Groceries" };

const ROWS = [
  { id: "1", merchant: "Blue Bottle", description: "Coffee with Sam", category: FOOD },
  { id: "2", merchant: "Uniqlo", description: null, category: SHOPPING },
  { id: "3", merchant: null, description: "Storage unit", category: null },
  { id: "4", merchant: "Whole Foods", description: "Weekly shop", category: GROCERIES },
];

function ids(rows: Array<{ id: string }>) {
  return rows.map((r) => r.id);
}

describe("filterTransactions", () => {
  it("returns everything when the query is empty", () => {
    expect(filterTransactions(ROWS, EMPTY_FILTER)).toHaveLength(4);
    expect(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "   " })).toHaveLength(4);
  });

  it("matches the merchant", () => {
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "uniqlo" }))).toEqual(["2"]);
  });

  it("matches the note", () => {
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "storage" }))).toEqual(["3"]);
  });

  it("ignores case and surrounding space", () => {
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "  BLUE bottle " }))).toEqual(["1"]);
  });

  it("matches partway through a word", () => {
    // Typing as you go should narrow the list, not wait for whole words.
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "uniq" }))).toEqual(["2"]);
  });

  it("matches across every searched field at once", () => {
    // "foo" is in the Whole Foods merchant and in the Food & Drink category.
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "foo" }))).toEqual(["1", "4"]);
  });

  it("matches the category name", () => {
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "groceries" }))).toEqual(["4"]);
  });

  it("survives a row with no category", () => {
    expect(ids(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "storage" }))).toEqual(["3"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterTransactions(ROWS, { ...EMPTY_FILTER, query: "zzz" })).toEqual([]);
  });

  it("filters to one category", () => {
    expect(
      ids(filterTransactions(ROWS, { ...EMPTY_FILTER, categoryId: "cat-shopping" }))
    ).toEqual(["2"]);
  });

  it("excludes uncategorised rows when a category is picked", () => {
    expect(
      filterTransactions(ROWS, { ...EMPTY_FILTER, categoryId: "cat-food" })
    ).toHaveLength(1);
  });

  it("applies the category and the query together", () => {
    // "foo" alone matches Blue Bottle and Whole Foods; the category decides.
    expect(
      ids(
        filterTransactions(ROWS, {
          ...EMPTY_FILTER,
          query: "foo",
          categoryId: "cat-groceries",
        })
      )
    ).toEqual(["4"]);
  });

  it("keeps only standing commitments when asked", () => {
    const rows = [
      { id: "1", merchant: "Greystar", recurrence: "monthly" },
      { id: "2", merchant: "Uniqlo", recurrence: "once" },
      { id: "3", merchant: "Geico", recurrence: "yearly" },
      // A row written before the recurrence column existed.
      { id: "4", merchant: "Old row", recurrence: null },
    ];
    expect(
      ids(filterTransactions(rows, { ...EMPTY_FILTER, recurringOnly: true }))
    ).toEqual(["1", "3"]);
  });
});

describe("isFilterActive", () => {
  it("is false for the empty filter", () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it("ignores a query that's only whitespace", () => {
    expect(isFilterActive({ ...EMPTY_FILTER, query: "   " })).toBe(false);
  });

  it.each([
    ["a query", { query: "coffee" }],
    ["a category", { categoryId: "cat-food" }],
    ["recurring only", { recurringOnly: true }],
  ])("is true with %s", (_label, patch) => {
    expect(isFilterActive({ ...EMPTY_FILTER, ...patch })).toBe(true);
  });
});
