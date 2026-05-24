import { describe, expect, it } from "vitest";
import { transactionsToCsv } from "./csv";
import type { TransactionRowData } from "@/components/dashboard/transaction-row";

function tx(overrides: Partial<TransactionRowData> = {}): TransactionRowData {
  return {
    id: "tx-1",
    amount: 12.5,
    date: "2026-05-24",
    merchant: "Tatte Bakery",
    description: "Coffee",
    category: {
      id: "food",
      name: "Food",
      icon: "utensils",
      color: "#D4762C",
    },
    ...overrides,
  };
}

describe("transactionsToCsv", () => {
  it("includes a header row", () => {
    expect(transactionsToCsv([])).toBe(
      "date,amount,category,merchant,description"
    );
  });

  it("exports transaction fields in stable column order", () => {
    expect(transactionsToCsv([tx()])).toBe(
      [
        "date,amount,category,merchant,description",
        "2026-05-24,12.50,Food,Tatte Bakery,Coffee",
      ].join("\n")
    );
  });

  it("escapes commas, quotes, and new lines", () => {
    const csv = transactionsToCsv([
      tx({
        merchant: 'Trader Joe"s',
        description: "Groceries, snacks\nweekly run",
      }),
    ]);

    expect(csv).toContain('"Trader Joe""s"');
    expect(csv).toContain('"Groceries, snacks\nweekly run"');
  });

  it("uses blank cells for optional fields", () => {
    expect(
      transactionsToCsv([
        tx({ merchant: null, description: null, category: null }),
      ])
    ).toBe(
      [
        "date,amount,category,merchant,description",
        "2026-05-24,12.50,,,",
      ].join("\n")
    );
  });
});
