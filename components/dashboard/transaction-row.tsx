import { Repeat } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { recurrenceBadge } from "@/lib/utils/recurrence";
import { CategoryIcon } from "@/components/ui/category-icon";
import { DeleteTransactionButton } from "./delete-transaction-button";

export interface TransactionRowData {
  id: string;
  amount: number | string;
  description: string | null;
  merchant: string | null;
  date: string;
  recurrence?: string | null;
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

  const badge = recurrenceBadge(t.recurrence);
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
        <p className="flex items-center gap-1.5 text-xs text-[var(--color-foreground-muted)]">
          <span className="truncate">{secondary}</span>
          {badge && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-foreground-muted)]"
              title={`Repeats ${badge.toLowerCase()} — counted every month toward your runway`}
            >
              <Repeat size={9} aria-hidden />
              {badge}
            </span>
          )}
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
