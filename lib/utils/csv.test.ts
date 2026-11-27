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
  it("exports transaction fields in stable column order", () => {
    expect(transactionsToCsv([tx()])).toBe(
      [
        "date,amount,category,merchant,description,recurrence",
        "2026-05-24,12.50,Food,Tatte Bakery,Coffee,once",
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

  it("defuses cells that a spreadsheet would run as formulas", () => {
    const csv = transactionsToCsv([
      tx({
        merchant: "=HYPERLINK(\"http://x\")",
        description: "+1 and -2",
        category: { id: "c", name: "@SUM(A1)", icon: "x", color: "#000" },
      }),
      tx({ merchant: "\tTabbed", description: "Fine - not first" }),
    ]);

    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain("'+1 and -2");
    expect(csv).toContain("'@SUM(A1)");
    expect(csv).toContain("'\tTabbed");
    expect(csv).toContain("Fine - not first");
    expect(csv).not.toContain("'Fine");
  });

  it("uses blank cells for optional fields", () => {
    expect(
      transactionsToCsv([
        tx({ merchant: null, description: null, category: null }),
      ])
    ).toBe(
      [
        "date,amount,category,merchant,description,recurrence",
        "2026-05-24,12.50,,,,once",
      ].join("\n")
    );
  });
});
