import Link from "next/link";
import { Repeat } from "lucide-react";
import type { CommitmentSummary } from "@/lib/utils/commitments";
import { formatCurrency } from "@/lib/utils/format";
import { CategoryIcon } from "@/components/ui/category-icon";

interface CommittedPanelProps {
  summary: CommitmentSummary;
}

export function CommittedPanel({ summary }: CommittedPanelProps) {
  const { commitments, total, remaining, shareOfIncome } = summary;

  if (commitments.length === 0) {
    return <EmptyState />;
  }

  // A share over 1 means the commitments alone outrun the income. Clamping
  // the bar keeps the layout intact; the copy underneath says what happened.
  const share = shareOfIncome === null ? null : Math.min(shareOfIncome, 1);
  const overCommitted = remaining !== null && remaining < 0;

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

          {share !== null && (
            <div className="space-y-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface)]"
                role="img"
                aria-label={`Commitments take ${Math.round(
                  (shareOfIncome ?? 0) * 100
                )}% of your monthly income`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(2, share * 100)}%`,
                    backgroundColor: overCommitted
                      ? "var(--color-status-red)"
                      : "var(--color-brand)",
                  }}
                />
              </div>
              <p className="text-sm text-[var(--color-foreground-muted)]">
                {overCommitted ? (
                  <>
                    That&rsquo;s{" "}
                    <span className="font-medium text-[var(--color-status-red)] tabular-nums">
                      {formatCurrency(Math.abs(remaining ?? 0))}/mo
                    </span>{" "}
                    more than you bring in, before anything else.
                  </>
                ) : (
                  <>
                    Leaves{" "}
                    <span className="font-medium tabular-nums text-[var(--color-foreground)]">
                      {formatCurrency(remaining ?? 0)}/mo
                    </span>{" "}
                    for everything else.
                  </>
                )}
              </p>
            </div>
          )}
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

function EmptyState() {
  return (
    <section className="rounded border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-6 text-center sm:p-8">
      <Repeat
        size={28}
        className="mx-auto text-[var(--color-foreground-subtle)]"
        aria-hidden
      />
      <h2 className="mt-3 font-medium text-[var(--color-foreground)]">
        Nothing committed yet
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--color-foreground-muted)]">
        Rent, insurance and subscriptions are owed whether or not you spend
        anything else. Set an expense to repeat and it&rsquo;ll show up here.
      </p>
      <Link
        href="/transactions/new"
        className="btn-primary mt-4 px-4 py-2 text-sm"
      >
        Log a recurring expense
      </Link>
    </section>
  );
}
