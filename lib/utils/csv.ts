import type { TransactionRowData } from "@/components/dashboard/transaction-row";

const CSV_HEADERS = [
  "date",
  "amount",
  "category",
  "merchant",
  "description",
  "recurrence",
];

export function transactionsToCsv(transactions: TransactionRowData[]): string {
  const rows = transactions.map((t) => [
    t.date,
    Number(t.amount).toFixed(2),
    neutralizeFormula(t.category?.name ?? ""),
    neutralizeFormula(t.merchant ?? ""),
    neutralizeFormula(t.description ?? ""),
    t.recurrence ?? "once",
  ]);

  return [CSV_HEADERS, ...rows].map(toCsvRow).join("\n");
}

// Excel and Sheets run a cell that starts with one of these as a formula.
// Applied to free-text fields only; amount is generated and never negative.
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function toCsvRow(values: string[]): string {
  return values.map(escapeCsvCell).join(",");
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
