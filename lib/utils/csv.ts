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
    t.category?.name ?? "",
    t.merchant ?? "",
    t.description ?? "",
    t.recurrence ?? "once",
  ]);

  return [CSV_HEADERS, ...rows].map(toCsvRow).join("\n");
}

function toCsvRow(values: string[]): string {
  return values.map(escapeCsvCell).join(",");
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
