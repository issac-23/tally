import { formatCurrency } from "@/lib/utils/format";

export interface TransactionRowData {
  id: string;
  amount: number | string;
  description: string | null;
  merchant: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface TransactionRowProps {
  transaction: TransactionRowData;
}

export function TransactionRow({ transaction: t }: TransactionRowProps) {
  const dateLabel = new Date(t.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const primary = t.merchant || t.description || "—";
  const secondary =
    t.merchant && t.description ? t.description : t.category?.name ?? "";

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base"
        style={{
          backgroundColor: t.category?.color
            ? `${t.category.color}1A`
            : "var(--color-surface)",
        }}
      >
        <span>{t.category?.icon ?? "📌"}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--color-foreground)] truncate">
          {primary}
        </p>
        <p className="text-xs text-[var(--color-foreground-muted)] truncate">
          {secondary}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-semibold text-[var(--color-foreground)]">
          {formatCurrency(Number(t.amount))}
        </p>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {dateLabel}
        </p>
      </div>
    </div>
  );
}
