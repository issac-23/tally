import { formatCurrency } from "@/lib/utils/format";
import { CategoryIcon } from "@/components/ui/category-icon";
import { DeleteTransactionButton } from "./delete-transaction-button";

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
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[40px_minmax(0,1fr)_auto_auto] sm:gap-4 sm:px-5">
      <div
        className="w-10 h-10 rounded flex items-center justify-center shrink-0"
        style={{
          backgroundColor: t.category?.color
            ? `${t.category.color}1A`
            : "var(--color-surface)",
          color: t.category?.color ?? "var(--color-foreground-muted)",
        }}
      >
        <CategoryIcon name={t.category?.icon} size={18} />
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

      <div className="col-start-3 row-span-2 row-start-1 sm:col-auto sm:row-auto">
        <DeleteTransactionButton id={t.id} />
      </div>
    </div>
  );
}
