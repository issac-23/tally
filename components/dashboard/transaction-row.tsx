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
    // One row at every width. The old grid put the delete button in its own
    // column on mobile, which forced the amount onto a second line under the
    // icon and left the button floating in the gap beside it.
    <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
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

      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-[var(--color-foreground)]">
          {formatCurrency(Number(t.amount))}
        </p>
        <p className="text-xs text-[var(--color-foreground-muted)]">
          {dateLabel}
        </p>
      </div>

      <div className="shrink-0">
        <DeleteTransactionButton id={t.id} />
      </div>
    </div>
  );
}
