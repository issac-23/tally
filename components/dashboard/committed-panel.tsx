import { Repeat } from "lucide-react";
import type { CommitmentSummary } from "@/lib/utils/commitments";
import { formatCurrency } from "@/lib/utils/format";
import { CategoryIcon } from "@/components/ui/category-icon";

interface CommittedPanelProps {
  summary: CommitmentSummary;
}

export function CommittedPanel({ summary }: CommittedPanelProps) {
  const { commitments, total } = summary;

  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-display text-h1 text-[var(--color-foreground)]">
          Already committed
        </h2>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {commitments.length} standing{" "}
          {commitments.length === 1 ? "commitment" : "commitments"}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-10">
        {/* The number this card exists for */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
              Spoken for each month
            </p>
            <p className="font-display text-display tabular-nums text-[var(--color-foreground)]">
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {/* What makes it up */}
        <ul className="divide-y divide-[var(--color-border)]">
          {commitments.map((c) => (
            <li key={c.key} className="flex items-center gap-3 py-2.5 first:pt-0">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
                style={{
                  backgroundColor: c.category?.color
                    ? `${c.category.color}1A`
                    : "var(--color-surface)",
                  color: c.category?.color ?? "var(--color-foreground-muted)",
                }}
              >
                <CategoryIcon name={c.category?.icon} size={15} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                  {c.label}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-foreground-muted)]">
                  <Repeat size={9} aria-hidden />
                  <span className="truncate">
                    {formatCurrency(c.amount)} {c.badge.toLowerCase()}
                  </span>
                </p>
              </div>

              <p className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                {formatCurrency(c.monthly)}
                <span className="font-normal text-[var(--color-foreground-muted)]">
                  /mo
                </span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
