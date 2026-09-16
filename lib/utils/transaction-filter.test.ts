import { describe, it, expect } from "vitest";
import { EMPTY_FILTER, filterTransactions } from "./transaction-filter";

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
    expect(filterTransactions(ROWS, { query: "   " })).toHaveLength(4);
  });

  it("matches the merchant", () => {
    expect(ids(filterTransactions(ROWS, { query: "uniqlo" }))).toEqual(["2"]);
  });

  it("matches the note", () => {
    expect(ids(filterTransactions(ROWS, { query: "storage" }))).toEqual(["3"]);
  });

  it("ignores case and surrounding space", () => {
    expect(ids(filterTransactions(ROWS, { query: "  BLUE bottle " }))).toEqual(["1"]);
  });

  it("matches partway through a word", () => {
    // Typing as you go should narrow the list, not wait for whole words.
    expect(ids(filterTransactions(ROWS, { query: "uniq" }))).toEqual(["2"]);
  });

  it("matches across every searched field at once", () => {
    // "foo" is in the Whole Foods merchant and in the Food & Drink category.
    expect(ids(filterTransactions(ROWS, { query: "foo" }))).toEqual(["1", "4"]);
  });

  it("matches the category name", () => {
    expect(ids(filterTransactions(ROWS, { query: "groceries" }))).toEqual(["4"]);
  });

  it("survives a row with no category", () => {
    expect(ids(filterTransactions(ROWS, { query: "storage" }))).toEqual(["3"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterTransactions(ROWS, { query: "zzz" })).toEqual([]);
  });
});
