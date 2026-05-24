"use client";

import { Download } from "lucide-react";
import type { TransactionRowData } from "@/components/dashboard/transaction-row";
import { transactionsToCsv } from "@/lib/utils/csv";

interface ExportTransactionsButtonProps {
  transactions: TransactionRowData[];
}

export function ExportTransactionsButton({
  transactions,
}: ExportTransactionsButtonProps) {
  const disabled = transactions.length === 0;

  function handleExport() {
    const csv = transactionsToCsv(transactions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tally-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      <Download size={16} />
      Export CSV
    </button>
  );
}
