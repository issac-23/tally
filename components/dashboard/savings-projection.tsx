import type { SavingsProjection } from "@/lib/utils/projection";
import { formatCurrency } from "@/lib/utils/format";
import { RunwayProjection } from "@/components/charts/runway-projection";

interface SavingsProjectionSectionProps {
  projection: SavingsProjection;
  monthlySalary: number;
  monthlyAvgSpend: number;
  /** See RunwayCard — no spending logged means no honest projection. */
  hasSpendingData?: boolean;
}

export function SavingsProjectionSection({
  projection,
  monthlySalary,
  monthlyAvgSpend,
  hasSpendingData = true,
}: SavingsProjectionSectionProps) {
  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6">
      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-display text-h1 text-[var(--color-foreground)]">
          Savings projection
        </h2>
        {hasSpendingData ? (
          <Caption projection={projection} />
        ) : (
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--color-foreground-muted)]">
            Needs spending data
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--color-foreground-muted)] mb-4">
        {hasSpendingData ? (
          <>
            Based on {formatCurrency(monthlySalary)}/mo income and{" "}
            {formatCurrency(monthlyAvgSpend)}/mo average spending. Dotted
            because the future is a guess.
          </>
        ) : (
          <>
            Assumes {formatCurrency(monthlySalary)}/mo income and no spending
            yet — log expenses to see a real curve.
          </>
        )}
      </p>

      <RunwayProjection
        projection={projection}
        monthLabels={buildMonthLabels(projection.points.length)}
        lineColor={
          projection.depletionMonth !== null
            ? "var(--color-status-red)"
            : "var(--color-status-green)"
        }
      />
    </section>
  );
}

/**
 * Build "Now, May, Jun, Jul..." labels anchored at today's month.
 * Server-rendered so the labels are stable on first paint.
 */
function buildMonthLabels(count: number): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      labels.push("Now");
      continue;
    }
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    labels.push(d.toLocaleDateString("en-US", { month: "short" }));
  }
  return labels;
}

function Caption({ projection }: { projection: SavingsProjection }) {
  if (projection.depletionMonth !== null) {
    const months = Math.round(projection.depletionMonth * 10) / 10;
    return (
      <span className="text-xs uppercase tracking-widest font-medium text-[var(--color-status-red)]">
        Depletes in ~{months} months
      </span>
    );
  }
  if (projection.monthlyNet > 0) {
    return (
      <span className="text-xs uppercase tracking-widest font-medium text-[var(--color-status-green)]">
        On track to keep saving
      </span>
    );
  }
  return (
    <span className="text-xs uppercase tracking-widest font-medium text-[var(--color-foreground-muted)]">
      Holding steady
    </span>
  );
}
