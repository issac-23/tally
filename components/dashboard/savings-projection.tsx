import type { SavingsProjection } from "@/lib/utils/projection";
import { formatCurrency } from "@/lib/utils/format";
import { RunwayProjection } from "@/components/charts/runway-projection";

interface SavingsProjectionSectionProps {
  projection: SavingsProjection;
  monthlySalary: number;
  monthlyAvgSpend: number;
}

export function SavingsProjectionSection({
  projection,
  monthlySalary,
  monthlyAvgSpend,
}: SavingsProjectionSectionProps) {
  return (
    <section className="rounded border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6">
      <div className="flex items-baseline justify-between mb-2 gap-4 flex-wrap">
        <h2 className="font-display text-h1 text-[var(--color-foreground)]">
          Savings projection
        </h2>
        <Caption projection={projection} />
      </div>

      <p className="text-xs text-[var(--color-foreground-muted)] mb-4">
        Based on {formatCurrency(monthlySalary)}/mo income and{" "}
        {formatCurrency(monthlyAvgSpend)}/mo average spending. Dotted because
        the future is a guess.
      </p>

      <RunwayProjection
        projection={projection}
        lineColor={
          projection.depletionMonth !== null
            ? "var(--color-status-red)"
            : "var(--color-status-green)"
        }
      />
    </section>
  );
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
