import { Inbox, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Slice, PeriodComparison } from "@/lib/utils/aggregation";
import { formatCurrency } from "@/lib/utils/format";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CategoryDonut } from "@/components/charts/category-donut";

interface SpendingBreakdownProps {
  title: string;
  slices: Slice[];
  /** Pass to show a "vs prior 30 days" delta in the header. Optional. */
  comparison?: PeriodComparison;
  /** Override the default "no spending" empty state copy. Optional. */
  emptyMessage?: string;
  /**
   * Cap the visible rows. Merchants are unbounded — a busy month produced a
   * 19-row list beside an 8-row category list, so the pair never balanced.
   */
  maxItems?: number;
}

export function SpendingBreakdown({
  title,
  slices,
  comparison,
  emptyMessage = "No spending in the last 30 days yet.",
  maxItems,
}: SpendingBreakdownProps) {
  const total = slices.reduce((sum, s) => sum + s.amount, 0);
  const visible = maxItems ? slices.slice(0, maxItems) : slices;
  const hidden = slices.length - visible.length;
  const hiddenAmount = slices
    .slice(visible.length)
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-h1 text-[var(--color-foreground)]">
          {title}
        </h2>
        {comparison && <PeriodDelta comparison={comparison} />}
      </div>

      {slices.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="space-y-8">
          {/* Donut + center total */}
          <div className="relative flex items-center justify-center">
            <CategoryDonut slices={slices} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display text-h1 text-[var(--color-foreground)]">
                {formatCurrency(total)}
              </p>
              <p className="text-xs uppercase tracking-widest text-[var(--color-foreground-muted)] font-medium mt-1">
                Last 30 days
              </p>
            </div>
          </div>

          {/* Breakdown list */}
          <ul className="space-y-3.5">
            {visible.map((s) => (
              <li key={s.category.id} className="space-y-1.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <span
                    className="shrink-0"
                    style={{ color: s.category.color }}
                  >
                    <CategoryIcon name={s.category.icon} size={14} />
                  </span>
                  <span className="flex-1 text-[var(--color-foreground)] truncate">
                    {s.category.name}
                  </span>
                  <span className="shrink-0 text-[var(--color-foreground-muted)] tabular-nums">
                    {formatCurrency(s.amount)}
                  </span>
                </div>
                <div className="h-1 bg-[var(--color-surface)] overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max(2, s.share * 100)}%`,
                      backgroundColor: s.category.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {hidden > 0 && (
            <p className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-foreground-muted)]">
              <span>
                {hidden} smaller {hidden === 1 ? "entry" : "entries"}
              </span>
              <span className="tabular-nums">
                {formatCurrency(hiddenAmount)}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function PeriodDelta({ comparison }: { comparison: PeriodComparison }) {
  if (comparison.deltaPercent === null) {
    return (
      <span className="text-xs text-[var(--color-foreground-muted)] uppercase tracking-widest font-medium">
        New period
      </span>
    );
  }

  // Round first, then branch — otherwise a delta like +0.4% rounds to "0%"
  // but still renders as a red increase with an up arrow.
  const rounded = Math.round(comparison.deltaPercent);

  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-foreground-muted)]">
        <Minus size={14} aria-hidden />
        No change
        <span className="font-normal">vs prior 30 days</span>
      </span>
    );
  }

  const up = rounded > 0;
  // For spending: up is bad (red), down is good (green).
  const color = up
    ? "text-[var(--color-status-red)]"
    : "text-[var(--color-status-green)]";
  const Icon = up ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon size={14} aria-hidden />
      {up ? "+" : ""}
      {rounded}%
      <span className="text-[var(--color-foreground-muted)] font-normal">
        vs prior 30 days
      </span>
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-[var(--color-border-strong)] rounded p-8 text-center space-y-2">
      <Inbox
        size={28}
        className="mx-auto text-[var(--color-foreground-subtle)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-foreground-muted)]">{message}</p>
    </div>
  );
}
