import { describe, it, expect } from "vitest";
import { EMPTY_FILTER, filterTransactions } from "./transaction-filter";

const ROWS = [
  { id: "1", merchant: "Blue Bottle", description: "Coffee with Sam" },
  { id: "2", merchant: "Uniqlo", description: null },
  { id: "3", merchant: null, description: "Storage unit" },
  { id: "4", merchant: "Whole Foods", description: "Weekly shop" },
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
    expect(ids(filterTransactions(ROWS, { query: "foo" }))).toEqual(["4"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterTransactions(ROWS, { query: "zzz" })).toEqual([]);
  });
});
